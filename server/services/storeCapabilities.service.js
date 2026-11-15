const { productUrl, resolveDescription } = require('./storeDescriptions.service');
const { sonyCache } = require('./consoleDlc.service');
const { steamId, details } = require('./steamDlc.service');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const xboxKeys = { CapabilityHDR: 'hdr', Capability4k: '4k', '120fps': '120fps', RayTracing: 'ray_tracing' };
const modeKeys = { SinglePlayer: 'single_player', XblOnlineMultiPlayer: 'online_multiplayer', XblOnlineCoop: 'online_coop', XblLocalMultiPlayer: 'local_multiplayer', XblLocalCoop: 'local_coop', XblCloudSaves: 'cloud_saves', XblAchievements: 'achievements', XboxLiveCrossPlatformMP: 'crossplay' };
function xboxCapabilities(data) {
  const product = data.Product;
  if (!product) throw fail('اطلاعات محصول Xbox موجود نیست.', 404);
  const properties = product.Properties || {};
  const rows = new Map();
  const global = {};
  const generations = properties.XboxConsoleGenOptimized || properties.XboxConsoleGenCompatible || [];
  // Generic Xbox flags describe the product family, not every older console.
  const consolePlatform = generations.includes('ConsoleGen9') ? 'xbox_series_xs' : generations.includes('ConsoleGen8') ? 'xbox_one' : null;
  for (const attribute of properties.Attributes || []) {
    if (modeKeys[attribute.Name]) global[modeKeys[attribute.Name]] = true;
    const key = xboxKeys[attribute.Name];
    if (!key) continue;
    for (const target of attribute.ApplicablePlatforms || []) {
      const platform = target === 'Desktop' ? 'pc' : target === 'Xbox' ? consolePlatform : null;
      if (!platform || (platform === 'xbox_one' && ['120fps', 'ray_tracing'].includes(key))) continue;
      rows.set(platform, { ...rows.get(platform), [key]: true });
    }
  }
  return { platforms: [...rows].map(([platform, status]) => ({ platform, status })), capability_status: global };
}
function steamCapabilities(data) {
  const categories = new Set((data.categories || []).map(row => row.description?.toLowerCase()));
  const status = {};
  if (['vr supported', 'vr support', 'vr only'].some(key => categories.has(key))) status.vr = true;
  if (categories.has('hdr available')) status.hdr = true;
  const global = {};
  for (const [category, key] of Object.entries({ 'single-player': 'single_player', 'online pvp': 'online_multiplayer', 'online co-op': 'online_coop', 'shared/split screen pvp': 'local_multiplayer', 'shared/split screen co-op': 'local_coop', 'steam cloud': 'cloud_saves', 'steam achievements': 'achievements', 'cross-platform multiplayer': 'crossplay' })) if (categories.has(category)) global[key] = true;
  return { platforms: Object.keys(status).length ? [{ platform: 'pc', status }] : [], capability_status: global };
}
function sonyCapabilities(html, source) {
  const cache = sonyCache(html);
  const id = new URL(source).pathname.match(/\/product\/([^/]+)/)?.[1];
  const conceptId = new URL(source).pathname.match(/\/concept\/(\d+)/)?.[1];
  const concept = Object.values(cache).find(row => row.__typename === 'Concept' && row.id === conceptId && row.defaultProduct);
  const defaultId = concept?.defaultProduct?.__ref && cache[concept.defaultProduct.__ref]?.id;
  const products = Object.values(cache).filter(row => row.__typename === 'Product' && row.compatibilityNoticesByPlatform && (id ? row.id === id : defaultId ? row.id === defaultId : false));
  const rows = new Map();
  for (const product of products) {
    for (const [name, platform] of [['PS4', 'ps4'], ['PS5', 'ps5']]) {
      const notices = product.compatibilityNoticesByPlatform[name] || [];
      const vr = notices.some(row => ['VR_HEADSET', 'PSVR', 'PSVR2', 'CAESAR_HEADSET'].includes(row.type) && ['REQUIRED', 'OPTIONAL', 'SUPPORTED'].includes(row.value));
      if (vr) rows.set(platform, { vr: true });
    }
  }
  return { platforms: [...rows].map(([platform, status]) => ({ platform, status })), capability_status: {} };
}
async function request(url, fetcher, json) {
  let response;
  try { response = await fetcher(url, { signal: AbortSignal.timeout(20000), redirect: 'error', headers: { Accept: json ? 'application/json' : 'text/html' } }); }
  catch { throw fail('اتصال به منبع قابلیت‌ها ناموفق بود.', 502); }
  if (!response.ok) throw fail('دریافت قابلیت‌ها از فروشگاه ناموفق بود.', response.status === 429 ? 429 : 502);
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 12 * 1024 * 1024) throw fail('پاسخ منبع بیش از حد بزرگ است.', 502);
    chunks.push(Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!json) return text;
  try { return JSON.parse(text); } catch { throw fail('پاسخ منبع معتبر نیست.', 502); }
}
function inputLinks(input) {
  return ['official_stores', 'offers'].flatMap(key => {
    let rows = input[key] || [];
    if (typeof rows === 'string') { try { rows = JSON.parse(rows); } catch { throw fail('لینک‌های فروشگاه معتبر نیست.'); } }
    if (!Array.isArray(rows) || rows.length > 100) throw fail('لینک‌های فروشگاه معتبر نیست.');
    return rows.map(row => row?.url).filter(value => typeof value === 'string');
  });
}
async function read(input, fetcher = fetch) {
  const urls = inputLinks(input);
  const providers = input.providers || ['xbox', 'sony', 'steam'];
  if (!Array.isArray(providers) || providers.length > 3 || providers.some(value => !['xbox', 'sony', 'steam'].includes(value))) throw fail('منبع قابلیت‌ها معتبر نیست.');
  const results = await Promise.all([...new Set(providers)].map(async provider => {
    try {
      if (provider === 'steam') {
        const ids = [...new Set(urls.map(steamId).filter(Boolean))];
        if (ids.length !== 1) throw fail(ids.length ? 'چند لینک Steam وجود دارد؛ نسخهٔ اصلی را مشخص کنید.' : 'لینک رسمی Steam بازی موجود نیست.');
        return { provider, source_url: `https://store.steampowered.com/app/${ids[0]}/`, ...steamCapabilities(await details(ids[0], fetcher)) };
      }
      let source = urls.map(url => { try { return productUrl(provider, url); } catch { return null; } }).find(Boolean);
      if (!source || new URL(source.source).hostname === 'www.playstation.com') {
        if (typeof input.title !== 'string' || input.title.trim().length < 2 || input.title.length > 200) throw fail('نام کامل یا لینک رسمی بازی لازم است.');
        const resolved = await resolveDescription({ provider, title: input.title, url: source?.source }, fetcher);
        source = productUrl(provider, resolved.url);
      }
      const data = await request(source.request, fetcher, provider === 'xbox');
      return { provider, source_url: source.source, ...(provider === 'xbox' ? xboxCapabilities(data) : sonyCapabilities(data, source.source)) };
    } catch (error) { return { provider, error: error.message || 'دریافت قابلیت‌ها ناموفق بود.' }; }
  }));
  return { results };
}
module.exports = { read, xboxCapabilities, steamCapabilities, sonyCapabilities };

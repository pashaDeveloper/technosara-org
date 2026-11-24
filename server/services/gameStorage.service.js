const { productUrl, selectTitle, xboxTitleRows } = require('./storeDescriptions.service');
const { steamId, details } = require('./steamDlc.service');
const { normalizePcRequirements } = require('../utils/pcRequirements');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
async function request(url, fetcher) {
  let response;
  try { response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(20000) }); }
  catch { throw fail('اتصال به منبع حجم ناموفق بود.', 502); }
  if (!response.ok) throw fail('اطلاعات حجم از فروشگاه دریافت نشد.', 502);
  const chunks = []; let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > 12 * 1024 * 1024) throw fail('پاسخ فروشگاه بیش از حد بزرگ است.', 502);
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw fail('پاسخ فروشگاه معتبر نیست.', 502); }
}
function xboxStorage(data) {
  const rows = [];
  for (const entry of data.Product?.DisplaySkuAvailabilities || []) {
    for (const pkg of entry.Sku?.Properties?.Packages || []) {
      const names = (pkg.PlatformDependencies || []).map(row => row.PlatformName);
      const platform = names.includes('Windows.Desktop') ? 'pc' : names.includes('Windows.Xbox') ? 'xbox' : null;
      if (!platform) continue;
      for (const [field, kind] of [['MaxDownloadSizeInBytes', 'download'], ['MaxInstallSizeInBytes', 'install']]) {
        const bytes = Number(pkg[field]);
        if (Number.isSafeInteger(bytes) && bytes > 0) rows.push({ platform, kind, bytes });
      }
    }
  }
  return [...new Map(rows.map(row => [`${row.platform}:${row.kind}:${row.bytes}`, row])).values()];
}
function steamStorage(data) {
  const text = String(data.pc_requirements?.minimum || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
  const match = text.match(/Storage\s*:\s*([\d,.]+)\s*(TB|GB|MB)\b/i);
  if (!match) return [];
  const bytes = Math.round(Number(match[1].replace(/,/g, '')) * ({ TB: 1e12, GB: 1e9, MB: 1e6 })[match[2].toUpperCase()]);
  return Number.isSafeInteger(bytes) && bytes > 0 ? [{ platform: 'pc', kind: 'required', bytes }] : [];
}
function steamRequirements(data, source_url) {
  const fields = {};
  for (const tier of ['minimum', 'recommended']) {
    const html = data.pc_requirements?.[tier];
    if (typeof html !== 'string') continue;
    const value = html
      .replace(/<(?:br\b[^>]*|\/li|\/p)>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&(nbsp|amp|lt|gt|quot|#39);/gi, entity => ({
        '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
      })[entity.toLowerCase()])
      .replace(/^\s*(?:minimum|recommended):\s*/i, '')
      .split('\n').map(line => line.trim()).filter(Boolean).join('\n');
    if (value) fields[tier] = value.slice(0, 12000);
  }
  if (fields.minimum || fields.recommended) return normalizePcRequirements({ ...fields, source_url });
}
async function read(input, fetcher = fetch) {
  const providers = input.providers || ['xbox', 'steam'];
  if (!Array.isArray(providers) || providers.length > 2 || providers.some(p => !['xbox', 'steam'].includes(p))) throw fail('منبع حجم معتبر نیست.');
  if (input.title !== undefined && (typeof input.title !== 'string' || input.title.trim().length < 2 || input.title.length > 200)) throw fail('نام کامل بازی را وارد کنید.');
  let links = [];
  for (const key of ['official_stores', 'offers']) {
    let rows = input[key] || [];
    if (typeof rows === 'string') { try { rows = JSON.parse(rows); } catch { throw fail('لینک‌های فروشگاه معتبر نیست.'); } }
    if (!Array.isArray(rows) || rows.length > 100) throw fail('لینک‌های فروشگاه معتبر نیست.');
    links.push(...rows.map(row => row?.url).filter(url => typeof url === 'string'));
  }
  if (input.url) links = [input.url];
  const sources = new Map();
  for (const url of links) {
    const id = steamId(url);
    if (id) { sources.set(`steam:${id}`, { provider: 'steam', id, source: `https://store.steampowered.com/app/${id}/` }); continue; }
    try { const source = productUrl('xbox', url); sources.set(source.source, { provider: 'xbox', ...source }); } catch {}
  }
  if (sources.size > 10) throw fail('حداکثر ۱۰ لینک محصول را بررسی کنید.');
  const discovery = await Promise.all([...new Set(providers)].filter(provider => input.title && ![...sources.values()].some(source => source.provider === provider)).map(async provider => {
    try {
      const query = encodeURIComponent(input.title.trim());
      if (provider === 'steam') {
        const data = await request(`https://store.steampowered.com/api/storesearch/?term=${query}&l=english&cc=us`, fetcher);
        const rows = (data.items || []).filter(row => /^[1-9]\d{0,9}$/.test(String(row.id))).map(row => ({ title: row.name, url: `https://store.steampowered.com/app/${row.id}/` }));
        const match = selectTitle(rows, input.title);
        return { provider, id: steamId(match.url), source: match.url };
      }
      const rows = await xboxTitleRows(input.title, fetcher);
      return { provider, ...productUrl('xbox', selectTitle(rows, input.title).url) };
    } catch (error) { return { provider, error: error.message, rows: [] }; }
  }));
  const errors = discovery.filter(row => row.error);
  const resolved = [...sources.values(), ...discovery.filter(row => !row.error)].filter(source => providers.includes(source.provider));
  const results = await Promise.all(resolved.map(async source => {
    try {
      let rows;
      let pc_requirements;
      if (source.provider === 'steam') {
        const data = await details(source.id, fetcher);
        rows = steamStorage(data);
        pc_requirements = steamRequirements(data, source.source);
      }
      else {
        let data = await request(source.request, fetcher);
        rows = xboxStorage(data);
        // Follow only a single explicitly primary base product, never sum a bundle's DLC.
        if (!rows.length) {
          const ids = [...new Set((data.Product?.DisplaySkuAvailabilities || []).flatMap(row => row.Sku?.Properties?.BundledSkus || []).filter(row => row.IsPrimary === true && /^[a-z0-9]{12}$/i.test(row.BigId)).map(row => row.BigId))];
          if (ids.length === 1) {
            const base = productUrl('xbox', `https://www.xbox.com/en-US/games/store/game/${ids[0]}`);
            data = await request(base.request, fetcher); rows = xboxStorage(data); source.source = base.source;
          }
        }
      }
      return { provider: source.provider, source_url: source.source, pc_requirements, rows: rows.map(row => ({ ...row, provider: source.provider, source_url: source.source, checked_at: new Date().toISOString() })), ...(!rows.length && { error: 'حجم قابل استناد در این محصول موجود نیست.' }) };
    } catch (error) { return { provider: source.provider, source_url: source.source, rows: [], error: error.message }; }
  }));
  results.push(...errors);
  return { results, ...(!results.length && { message: 'برای دریافت خودکار، نام بازی و پلتفرم را انتخاب کنید. حجم PlayStation در منابع فعلی قابل دریافت نیست.' }) };
}
module.exports = { read, xboxStorage, steamStorage };

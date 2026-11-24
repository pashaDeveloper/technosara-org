const Platform = require('../models/platform.model');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const normalize = value => String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[™®©]/g, '').replace(/[^a-z0-9]/g, '');
const titleKey = value => normalize(String(value || '').replace(/\b(i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/gi, value => ({ i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' })[value.toLowerCase()]));
const systems = {
  ps1: { aliases: ['playstation1', 'ps1', 'sonyplaystation', 'sonyplaystation1'], repo: 'Sony_-_PlayStation' },
  ps2: { aliases: ['playstation2', 'ps2', 'sonyplaystation2'], repo: 'Sony_-_PlayStation_2' },
  ps3: { aliases: ['playstation3', 'ps3', 'sonyplaystation3'], repo: 'Sony_-_PlayStation_3' },
  ps4: { aliases: ['playstation4', 'ps4', 'sonyplaystation4'], repo: 'Sony_-_PlayStation_4' },
  ps5: { aliases: ['playstation5', 'ps5', 'sonyplaystation5'] },
  psp: { aliases: ['psp', 'playstationportable', 'sonypsp', 'sonyplaystationportable'], repo: 'Sony_-_PlayStation_Portable' },
  vita: { aliases: ['psvita', 'playstationvita', 'sonyplaystationvita'], repo: 'Sony_-_PlayStation_Vita' },
  xbox: { aliases: ['originalxbox', 'microsoftxbox', 'xboxclassic'], repo: 'Microsoft_-_Xbox' },
  xbox360: { aliases: ['xbox360', 'microsoftxbox360'], repo: 'Microsoft_-_Xbox_360' },
  xboxone: { aliases: ['xboxone', 'microsoftxboxone'] },
  xboxseries: { aliases: ['xboxseriesxs', 'xboxseriesx', 'xboxseriess', 'xboxseries', 'microsoftxboxseriesx', 'microsoftxboxseriess', 'microsoftxboxseriesxs'] },
  switch: { aliases: ['switch', 'nintendoswitch'] },
  switch2: { aliases: ['switch2', 'nintendoswitch2'] },
};
function systemFor(platform) {
  const names = [platform?.code, platform?.value, platform?.slug, platform?.short_name, platform?.name, platform?.name_en].map(normalize);
  if (names.some(name => /gamepass|cloudgaming|xcloud/.test(name))) return null;
  return Object.keys(systems).find(key => systems[key].aliases.some(alias => names.includes(alias)));
}
const cache = new Map();
async function cached(key, action, fetcher) {
  if (fetcher !== fetch) return action();
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.value;
  const value = await action();
  if (cache.size > 30) cache.delete(cache.keys().next().value);
  cache.set(key, { value, expires: Date.now() + 6 * 60 * 60 * 1000 });
  return value;
}
async function json(url, fetcher) {
  let response;
  try { response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(20000), headers: { Accept: 'application/json', 'User-Agent': 'Technosara-BoxArt' } }); }
  catch { throw fail('اتصال به منبع کاور ناموفق بود.', 502); }
  if (!response.ok) throw fail(response.status === 429 || response.status === 403 ? 'دسترسی یا سهمیهٔ منبع کاور را بررسی کنید.' : 'دریافت کاور ناموفق بود.', response.status === 429 ? 429 : 502);
  const chunks = []; let size = 0;
  for await (const chunk of response.body) { size += chunk.length; if (size > 12 * 1024 * 1024) throw fail('پاسخ منبع بیش از حد بزرگ است.', 502); chunks.push(Buffer.from(chunk)); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw fail('پاسخ منبع کاور معتبر نیست.', 502); }
}
function chooseLibretro(paths, title) {
  const matches = paths.filter(path => typeof path === 'string' && !path.includes('..') && path.startsWith('Named_Boxarts/') && path.endsWith('.png') && titleKey(path.slice('Named_Boxarts/'.length, -4).replace(/\s*\((?:USA|Europe|Japan|World|Asia|Australia|Korea|China|Brazil|[A-Z][a-z](?:,[A-Z][a-z])*)\)/g, '')) === titleKey(title));
  return matches.sort((a, b) => {
    const rank = path => /\(USA\)/.test(path) ? 0 : /\(World\)/.test(path) ? 1 : /\(Europe\)/.test(path) ? 2 : 3;
    return rank(a) - rank(b) || a.localeCompare(b);
  })[0];
}
async function libretro(title, system, fetcher) {
  const repo = systems[system].repo;
  if (!repo) throw fail('برای دریافت کاور این کنسول، کلید TheGamesDB باید در سرور تنظیم شود.', 503);
  const tree = await cached(`libretro:${repo}`, () => json(`https://api.github.com/repos/libretro-thumbnails/${repo}/git/trees/master?recursive=1`, fetcher), fetcher);
  if (tree.truncated) throw fail('فهرست کاورها ناقص دریافت شد.', 502);
  const path = chooseLibretro((tree.tree || []).filter(row => row.type === 'blob').map(row => row.path), title);
  if (!path) {
    const candidates = (tree.tree || []).filter(row => row.type === 'blob' && typeof row.path === 'string' && row.path.startsWith('Named_Boxarts/') && row.path.endsWith('.png') && !row.path.includes('..'))
      .map(row => ({ path: row.path, title: row.path.slice('Named_Boxarts/'.length, -4) }))
      .filter(row => titleSimilarity(row.title, title) >= 0.4)
      .sort((a, b) => titleSimilarity(b.title, title) - titleSimilarity(a.title, title)).slice(0, 20)
      .map(row => { const url = 'https://raw.githubusercontent.com/libretro-thumbnails/' + repo + '/master/' + row.path.split('/').map(encodeURIComponent).join('/'); return { provider: 'libretro', side: 'front', title: row.title, low_quality: url, high_quality: url, source_url: 'https://github.com/libretro-thumbnails/' + repo + '/blob/master/' + row.path.split('/').map(encodeURIComponent).join('/') }; });
    if (candidates.length) return { candidates };
  }
  if (!path) throw fail('کاور جعبه برای همین نام و کنسول در آرشیو موجود نیست.', 404);
  const url = `https://raw.githubusercontent.com/libretro-thumbnails/${repo}/master/${path.split('/').map(encodeURIComponent).join('/')}`;
  return { provider: 'libretro', side: 'front', title: path.slice('Named_Boxarts/'.length, -4), low_quality: url, high_quality: url, source_url: `https://github.com/libretro-thumbnails/${repo}` };
}
function tgdbImages(data, game) {
  const images = data.include?.boxart?.data?.[game.id] || [];
  const image = images.find(row => row.type === 'boxart' && row.side === 'front' && /^boxart\/front\/[a-zA-Z0-9._/-]+$/.test(row.filename) && !row.filename.includes('..'));
  if (!image) return null;
  // Use fixed CDN roots rather than URLs supplied by an upstream response.
  return { provider: 'thegamesdb', side: 'front', title: game.game_title, low_quality: `https://cdn.thegamesdb.net/images/medium/${image.filename}`, high_quality: `https://cdn.thegamesdb.net/images/original/${image.filename}`, source_url: `https://thegamesdb.net/game.php?id=${encodeURIComponent(game.id)}` };
}
function titleSimilarity(candidate, title) {
  if (titleKey(candidate) === titleKey(title)) return 1;
  const words = value => new Set(String(value).toLowerCase().match(/[a-z0-9]+/g) || []);
  const a = words(candidate), b = words(title);
  return 2 * [...a].filter(word => b.has(word)).length / (a.size + b.size || 1);
}
async function thegamesdb(title, system, key, fetcher) {
  const platforms = await cached('tgdb:platforms', () => json(`https://api.thegamesdb.net/v1/Platforms?apikey=${encodeURIComponent(key)}`, fetcher), fetcher);
  const platformsData = platforms.data?.platforms || {};
  const platform = Object.values(platformsData).find(row => systems[system].aliases.includes(normalize(row.name)) || systems[system].aliases.includes(normalize(row.alias)));
  if (!platform) throw fail('این کنسول در منبع کاور پیدا نشد.', 404);
  const params = new URLSearchParams({ apikey: key, name: title, 'filter[platform]': String(platform.id), fields: 'platform', include: 'boxart' });
  let data = await json(`https://api.thegamesdb.net/v1.1/Games/ByGameName?${params}`, fetcher);
  const matchingGames = data => Object.values(data.data?.games || {}).filter(row => String(row.platform) === String(platform.id) && titleSimilarity(row.game_title, title) >= 0.4).sort((a, b) => titleSimilarity(b.game_title, title) - titleSimilarity(a.game_title, title));
  let games = matchingGames(data);
  // Retry a shorter query and keep similar titles on the selected console for user selection.
  const suffix = title.trim().split(/\s+/).slice(-3).join(' ');
  if (!games.some(game => titleKey(game.game_title) === titleKey(title)) && suffix !== title.trim()) {
    params.set('name', suffix);
    const extra = await json(`https://api.thegamesdb.net/v1.1/Games/ByGameName?${params}`, fetcher);
    data = { ...extra, data: { games: [...Object.values(data.data?.games || {}), ...Object.values(extra.data?.games || {})] }, include: { boxart: { data: { ...data.include?.boxart?.data, ...extra.include?.boxart?.data } } } };
    games = [...new Map(matchingGames(data).map(game => [game.id, game])).values()];
  }
  const candidates = games.map(game => tgdbImages(data, game)).filter(Boolean);
  if (candidates.length > 1 || (candidates.length === 1 && titleKey(candidates[0].title) !== titleKey(title))) return { candidates };
  const result = candidates[0];
  if (!result) throw fail('کاور جلوی جعبه برای این عنوان و کنسول پیدا نشد.', 404);
  return result;
}
async function read({ title, platform_id, xbox_url, exact_xbox }, fetcher = fetch, env = process.env) {
  if (typeof title !== 'string' || title.trim().length < 2 || title.length > 200 || !normalize(title)) throw fail('ابتدا نام کامل انگلیسی بازی را انتخاب کنید.');
  if (!require('mongoose').isObjectIdOrHexString(platform_id)) throw fail('پلتفرم کاور معتبر نیست.');
  const platform = await Platform.findById(platform_id).lean();
  if (!platform) throw fail('پلتفرم پیدا نشد.', 404);
  let system = systemFor(platform);
  if (!system && platform.parent_id) system = systemFor(await Platform.findById(platform.parent_id).lean());
  if (!system) throw fail('کاور فیزیکی برای این پلتفرم قابل دریافت نیست.');
  if (xbox_url && ['xboxone', 'xboxseries'].includes(system)) {
    try {
      const source = await require('./gameMedia.service').read({ provider: 'xbox', url: xbox_url, media: 'box' }, fetcher);
      const url = source.box_images[0];
      if (url) return { provider: 'xbox', side: 'front', title: source.title,
        low_quality: url, high_quality: url, source_url: source.source_url };
    } catch (error) {
      if (exact_xbox === true) throw error;
    }
    if (exact_xbox === true) throw fail('کاور این نسخه در Xbox پیدا نشد.', 404);
  }
  if (env.THEGAMESDB_API_KEY?.trim()) return thegamesdb(title.trim(), system, env.THEGAMESDB_API_KEY.trim(), fetcher);
  return libretro(title.trim(), system, fetcher);
}
module.exports = { read, systemFor, chooseLibretro, tgdbImages };

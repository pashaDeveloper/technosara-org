const { importCollection } = require('./platpricesTrophies.service');
const { inputLinks } = require('./consoleDlc.service');
const Game = require('../models/game.model');
const mongoose = require('mongoose');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const id = value => {
  const text = String(value ?? '');
  if (!/^\d{1,20}$/.test(text)) throw fail('شناسهٔ Xbox معتبر نیست.');
  return text;
};
async function request(path, fetcher) {
  const key = process.env.OPENXBL_API_KEY?.trim();
  if (!key) throw fail('کلید OpenXBL تنظیم نشده است.', 503);
  let response, data;
  try {
    response = await fetcher(`https://api.xbl.io/v2/${path}`, { headers: { 'X-Authorization': key, Accept: 'application/json', 'Accept-Language': 'en-US' }, redirect: 'error', signal: AbortSignal.timeout(20000) });
    data = await response.json();
  } catch { throw fail('اتصال به OpenXBL ناموفق بود.', 502); }
  const status = response.ok ? Number(data.code || 200) : response.status;
  if (status >= 400) throw fail(({ 401: 'کلید OpenXBL معتبر نیست.', 403: 'دسترسی Xbox مجاز نیست.', 429: 'سهمیهٔ OpenXBL تمام شده است.' })[status] || 'دریافت اطلاعات Xbox ناموفق بود.', [401, 403, 404, 429].includes(status) ? status : 502);
  let content = data.content ?? data;
  if (typeof content === 'string') { try { content = JSON.parse(content); } catch { throw fail('پاسخ OpenXBL معتبر نیست.', 502); } }
  return content;
}
function card(row) {
  // Device compatibility includes backwards compatibility; the achievement set's
  // original platform determines where it belongs in the catalogue.
  const devices = row.devices || [];
  const platform = devices.includes('Xbox360') ? 'xbox_360' : devices.includes('XboxOne') ? 'xbox_one' : devices.includes('XboxSeries') ? 'xbox_series_xs' : null;
  const compatible_platforms = [['Xbox360', 'Xbox 360'], ['XboxOne', 'Xbox One'], ['XboxSeries', 'Xbox Series X|S']].filter(([device]) => devices.includes(device)).map(([, name]) => name);
  return { ppid: id(row.titleId), title: row.name, platforms: platform ? [platform] : [], compatible_platforms };
}
async function candidates(input = {}, fetcher = fetch) {
  const mappings = await resolveProducts(input, fetcher);
  const rows = mappings.map(mapping => ({ ...card(mapping.title), product_id: mapping.product_id })).filter(row => row.platforms.length);
  return [...new Map(rows.map(row => [row.ppid, row])).values()];
}
async function resolveProducts(input, fetcher) {
  const links = inputLinks(input).filter(row => row.provider === 'xbox');
  if (!links.length) throw fail('ابتدا لینک رسمی نسخهٔ Xbox بازی را ثبت کنید.');
  const mappings = [];
  for (const link of links) {
    let response, data;
    try {
      response = await fetcher(`https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${link.id}&market=US&languages=en-US&fieldsTemplate=Details`, { redirect: 'error', signal: AbortSignal.timeout(20000) });
      data = await response.json();
    } catch { throw fail('دریافت شناسهٔ نسخه از کاتالوگ Xbox ناموفق بود.', 502); }
    if (!response.ok || !Array.isArray(data.Products)) throw fail('پاسخ کاتالوگ Xbox معتبر نیست.', 502);
    const product = data.Products.find(row => row.ProductId === link.id);
    if (!product) throw fail('نسخهٔ Xbox در کاتالوگ پیدا نشد.', 404);
    const titleIds = [...new Set((product.AlternateIds || []).filter(row => row.IdType === 'XboxTitleId').map(row => id(row.Value)))];
    // Bundles without their own title identity cannot safely identify one game.
    const generations = product.Properties?.XboxConsoleGenCompatible || [];
    const devices = generations.flatMap(value => value === 'ConsoleGen8' ? ['XboxOne'] : value === 'ConsoleGen9' ? ['XboxSeries'] : []);
    for (const title_id of titleIds) mappings.push({ product_id: link.id, title_id, title: { titleId: title_id, name: product.LocalizedProperties?.[0]?.ProductTitle || link.id, devices } });
  }
  if (!mappings.length) throw fail('این لینک شناسهٔ اچیومنت مستقل ندارد؛ لینک نسخهٔ اصلی بازی را وارد کنید.', 409);
  return mappings;
}
async function preview(input = {}, fetcher = fetch) {
  const titleId = id(input.ppid);
  const mappings = await resolveProducts(input, fetcher);
  const mapping = mappings.find(row => row.title_id === titleId && row.product_id === input.product_id);
  if (!mapping) throw fail('شناسهٔ اچیومنت با لینک فروشگاه بازی تطابق ندارد.', 409);
  const account = await request('account', fetcher);
  const xuid = id(account.profileUsers?.[0]?.id);
  const game = card(mapping.title);
  if (!game.platforms.includes(input.platform)) throw fail('پلتفرم با نسخهٔ Xbox تطابق ندارد.');
  const base = input.platform === 'xbox_360' ? `achievements/x360/${xuid}/title/${titleId}` : `achievements/player/${xuid}/${titleId}`;
  const trophies = [], account_progress = [], seen = new Set(), tokens = new Set();
  let token;
  do {
    const page = await request(base + (token ? `?continuationToken=${encodeURIComponent(token)}` : ''), fetcher);
    if (!Array.isArray(page.achievements)) throw fail('فهرست اچیومنت‌های Xbox معتبر نیست.', 502);
    for (const row of page.achievements) {
      const external_id = id(row.id);
      if (seen.has(external_id) || !row.name?.trim() || (row.titleAssociations?.length && !row.titleAssociations.some(t => String(t.id) === titleId))) throw fail('فهرست اچیومنت‌ها تکراری یا متعلق به بازی دیگری است.', 502);
      seen.add(external_id);
      const reward = row.rewards?.find(r => r.type === 'Gamerscore');
      const points = reward ? Number(reward.value) : null;
      if (points != null && (!Number.isSafeInteger(points) || points < 0)) throw fail('امتیاز اچیومنت معتبر نیست.', 502);
      const rarity = row.rarity?.currentPercentage ?? null;
      if (rarity != null && (typeof rarity !== 'number' || !Number.isFinite(rarity) || rarity < 0 || rarity > 100)) throw fail('درصد کمیابی معتبر نیست.', 502);
      trophies.push({ external_id, name: row.name, description: row.description || row.lockedDescription || '', locked_description: row.lockedDescription || '', achievement_type: 'standard', points, hidden: Boolean(row.isSecret), icon_url: row.mediaAssets?.find(a => a.type === 'Icon')?.url || null, rarity,
        rarity_category: row.rarity?.currentCategory || null, source_achievement_type: row.achievementType || null,
        participation_type: row.participationType || null, estimated_time: row.estimatedTime && row.estimatedTime !== '00:00:00' ? row.estimatedTime : null,
        time_window: { start_date: validDate(row.timeWindow?.startDate), end_date: validDate(row.timeWindow?.endDate) },
        is_revoked: Boolean(row.isRevoked), service_config_id: row.serviceConfigId || null, source_product_id: row.productId || null,
        source_platforms: Array.isArray(row.platforms) ? row.platforms : [], deeplink: row.deeplink || null });
      account_progress.push({ external_id, provider: 'openxbl', account_id: xuid, progress_state: row.progressState || null,
        unlocked_at: validDate(row.progression?.timeUnlocked), requirements: (row.progression?.requirements || []).map(requirement => ({
          external_id: requirement.id, current: requirement.current == null ? null : String(requirement.current), target: requirement.target == null ? null : String(requirement.target),
          operation_type: requirement.operationType, value_type: requirement.valueType, participation_type: requirement.ruleParticipationType
        })) });
    }
    token = page.pagingInfo?.continuationToken;
    if (token && (tokens.has(token) || tokens.size >= 100)) throw fail('صفحه‌بندی اچیومنت‌ها معتبر نیست.', 502);
    if (token) tokens.add(token);
    if (!token && Number.isInteger(page.pagingInfo?.totalRecords) && page.pagingInfo.totalRecords !== trophies.length) throw fail('فهرست اچیومنت‌ها ناقص است.', 502);
  } while (token);
  return { provider: 'openxbl', product_id: mapping.product_id, ppid: titleId, platform: input.platform, game, list_id: titleId, total: trophies.length, counts: { standard: trophies.length }, trophies, account_progress };
}
function validDate(value) {
  if (typeof value !== 'string' || value.startsWith('0001-')) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
async function importTrophies(gameId, input, admin, fetcher = fetch) {
  if (!mongoose.isObjectIdOrHexString(gameId)) throw fail('شناسهٔ بازی معتبر نیست.');
  const game = await Game.findById(gameId);
  if (!game) throw fail('بازی ذخیره‌شده پیدا نشد.', 404);
  return importCollection(gameId, await preview({ ...input, official_stores: game.official_stores || [], offers: game.offers || [] }, fetcher), admin);
}
module.exports = { candidates, preview, importTrophies };

const mongoose = require('mongoose');
const Game = require('../models/game.model');
const Platform = require('../models/platform.model');
const Group = require('../models/achievementGroup.model');
const Achievement = require('../models/achievement.model');
const crypto = require('node:crypto');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const cache = new Map();
const identifier = value => {
  const id = String(value ?? '');
  if (!/^[1-9]\d{0,11}$/.test(id)) throw fail('شناسهٔ بازی در سرویس تروفی معتبر نیست.');
  return id;
};
function region(value = 'US') {
  if (typeof value !== 'string' || !/^[a-z]{2}$/i.test(value)) throw fail('منطقهٔ فروشگاه معتبر نیست.');
  return value.toUpperCase();
}
async function request(path, market, fetcher = fetch) {
  const key = process.env.PLATPRICES_API_KEY?.trim();
  if (!key) throw fail('کلید سرویس تروفی هنوز تنظیم نشده است.', 503);
  const url = new URL(`https://platprices.com/api/v2/${path}`); url.searchParams.set('region', region(market));
  const cacheKey = crypto.createHash('sha256').update(key).digest('hex') + ':' + url.href;
  const hit = cache.get(cacheKey);
  if (fetcher === fetch && hit && hit.expires > Date.now()) return hit.promise;
  const entry = { expires: Date.now() + 3600000 };
  entry.promise = (async () => {
    let response;
    try { response = await fetcher(url.href, { headers: { 'X-API-Key': key, Accept: 'application/json' }, signal: AbortSignal.timeout(20000), redirect: 'error' }); }
    catch { throw fail('اتصال به سرویس تروفی ناموفق بود.', 502); }
    const messages = { 401: 'کلید سرویس تروفی معتبر نیست یا منقضی شده است.', 403: 'دسترسی این کلید به منطقه یا قابلیت درخواستی مجاز نیست.', 404: 'این بازی در سرویس تروفی پیدا نشد.', 429: 'سهمیه یا محدودیت درخواست سرویس تروفی تمام شده است.' };
    if (!response.ok) throw fail(messages[response.status] || 'سرویس تروفی پاسخ معتبر نداد.', messages[response.status] ? response.status : 502);
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 4 * 1024 * 1024) throw fail('پاسخ تروفی بیش از حد بزرگ است.', 502);
      chunks.push(Buffer.from(chunk));
    }
    let data;
    try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw fail('پاسخ سرویس تروفی معتبر نیست.', 502); }
    if (data.success !== true || data.data == null) throw fail('سرویس تروفی درخواست را تکمیل نکرد.', 502);
    return data.data;
  })();
  if (fetcher === fetch) {
    if (cache.size >= 200) cache.delete(cache.keys().next().value);
    cache.set(cacheKey, entry);
  }
  try { return await entry.promise; } catch (error) { if (cache.get(cacheKey) === entry) cache.delete(cacheKey); throw error; }
}
function gameCard(row) {
  if (!row || typeof row !== 'object') throw fail('اطلاعات بازی در سرویس تروفی معتبر نیست.', 502);
  return { ppid: identifier(row.PPID), title: row.ProductName || row.GameName || '', psn_id: row.PSNID || '', image: row.Img || row.CoverArt || '',
    platforms: [Number(row.IsPS4) === 1 && 'ps4', Number(row.IsPS5) === 1 && 'ps5'].filter(Boolean) };
}
async function candidates(input = {}, fetcher = fetch) {
  if (typeof input.title !== 'string' || input.title.trim().length < 2 || input.title.length > 200) throw fail('ابتدا عنوان بازی را وارد کنید.');
  const rows = await request(`games/search?q=${encodeURIComponent(input.title.trim())}`, input.region, fetcher);
  if (!Array.isArray(rows)) throw fail('فهرست بازی‌های سرویس تروفی معتبر نیست.', 502);
  const cards = rows.filter(row => !Number(row.IsDLC) && !Number(row.IsDemoOrSoundtrack)).map(gameCard).filter(row => row.title && row.platforms.length);
  if (!input.linkedOnly) return cards;
  const links = require('./consoleDlc.service').inputLinks(input).filter(row => row.provider === 'playstation');
  return cards.filter(row => /^[A-Z]{4}\d{5}$/.test(row.psn_id) && links.some(link => link.id.includes(row.psn_id)));
}
function normalizeTrophies(data, ppid) {
  if (!data || String(data.ppid) !== ppid || !Array.isArray(data.trophies) || !Number.isSafeInteger(data.total) || data.total !== data.trophies.length) throw fail('فهرست تروفی ناقص است یا به بازی دیگری تعلق دارد.', 502);
  const ids = new Set(), counts = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  const trophies = data.trophies.map(row => {
    if (!row || typeof row.name !== 'string') throw fail('اطلاعات تروفی معتبر نیست.', 502);
    const id = row.id == null ? '' : String(row.id);
    if (!id || ids.has(id) || !row.name?.trim() || !Object.hasOwn(counts, row.grade)) throw fail('شناسه، نام یا نوع یکی از تروفی‌ها معتبر نیست.', 502);
    ids.add(id); counts[row.grade]++;
    if (row.earned_rate != null && (typeof row.earned_rate !== 'number' || row.earned_rate < 0 || row.earned_rate > 100)) throw fail('درصد دریافت تروفی معتبر نیست.', 502);
    return { external_id: id, name: row.name, description: row.description || '', achievement_type: row.grade, icon_url: row.icon || null, rarity: row.earned_rate ?? null, is_dlc: false, dlc_id: null };
  });
  for (const [grade, count] of Object.entries(counts)) if (data.counts?.[grade] !== count) throw fail('تعداد تروفی‌های منبع با فهرست برابر نیست.', 502);
  if (data.total && !data.list_id) throw fail('شناسهٔ مجموعهٔ تروفی موجود نیست.', 502);
  return { list_id: data.list_id == null ? null : String(data.list_id), total: data.total, counts, trophies };
}
async function preview(input = {}, fetcher = fetch) {
  const ppid = identifier(input.ppid), market = region(input.region);
  const game = gameCard(await request(`games/${ppid}`, market, fetcher));
  if (game.ppid !== ppid) throw fail('شناسهٔ بازی برگشتی معتبر نیست.', 502);
  if (!['ps4', 'ps5'].includes(input.platform) || !game.platforms.includes(input.platform)) throw fail('پلتفرم انتخاب‌شده متعلق به این نسخه نیست.');
  const data = await request(`games/${ppid}/trophies`, market, fetcher);
  return { ...normalizeTrophies(data, ppid), game, ppid, platform: input.platform, region: market };
}
const active = new Set();
async function importTrophies(gameId, input = {}, admin, fetcher = fetch) {
  return importCollection(gameId, await preview(input, fetcher), admin);
}
async function importCollection(gameId, data, admin) {
  if (!mongoose.isObjectIdOrHexString(gameId)) throw fail('شناسهٔ بازی معتبر نیست.');
  const game = await Game.findById(gameId);
  if (!game) throw fail('بازی ذخیره‌شده پیدا نشد.', 404);
  if (!data.total) return { saved: 0, total: 0 };
  const platformValue = { ps4: 'playstation_4', ps5: 'playstation_5' }[data.platform] || data.platform;
  const platform = await Platform.findOne({ $or: [{ code: { $in: [data.platform, platformValue] } }, { value: platformValue }, { short_name: data.platform.toUpperCase() }] });
  if (!platform) throw fail('ابتدا پلتفرم این نسخه را در کاتالوگ ثبت کنید.', 409);
  const setId = `${data.list_id}:${data.platform}`, lock = `${gameId}:${setId}`;
  if (active.has(lock)) throw fail('تروفی‌های این بازی در حال ثبت هستند.', 409);
  active.add(lock);
  try {
    const identity = { provider: data.provider || 'platprices', external_set_id: setId, external_group_id: data.group_id || 'default' };
    let group = await Group.findOne(identity);
    if (group && (String(group.game_id) !== String(gameId) || String(group.platform_id) !== String(platform._id))) throw fail('این مجموعهٔ تروفی به بازی دیگری متصل است.', 409);
    if (!group) group = await Group.findOneAndUpdate(identity, { $setOnInsert: { ...identity, external_product_id: data.product_id || null, game_id: gameId, platform_id: platform._id, name: data.game.title, group_type: data.group_type || (data.provider === 'openxbl' ? 'other' : 'base_game'), creator: admin } }, { upsert: true, new: true, runValidators: true });
    if (!group.external_product_id && data.product_id) group.external_product_id = data.product_id;
    if (data.manual === true) group.mapping_method = 'manual';
    if (String(group.game_id) !== String(gameId)) throw fail('این مجموعه هم‌زمان به بازی دیگری متصل شد.', 409);
    const failures = [];
    for (const row of data.trophies) {
      const identity = { achievement_group_id: group._id, external_id: row.external_id };
      const metadata = data.provider === 'openxbl' ? Object.fromEntries(['locked_description', 'rarity', 'rarity_category', 'source_achievement_type', 'participation_type', 'estimated_time', 'time_window', 'is_revoked', 'service_config_id', 'source_product_id', 'source_platforms', 'deeplink'].map(key => [key, row[key]])) : {};
      const insert = { ...row, ...identity, game_id: gameId, platform_id: platform._id, creator: admin };
      for (const key of Object.keys(metadata)) delete insert[key];
      const achievement = await Achievement.findOneAndUpdate(identity, { $setOnInsert: insert, ...(Object.keys(metadata).length ? { $set: metadata } : {}) }, { upsert: true, new: true, runValidators: true });
      try { await require('./automaticMedia.service').enrich(achievement, game, 'trophy', row); }
      catch { failures.push(row.external_id); }
      const progress = data.account_progress?.find(item => item.external_id === row.external_id);
      if (progress) {
        const { external_id, ...snapshot } = progress;
        await require('../models/achievementProgress.model').findOneAndUpdate({ achievement_id: achievement._id, provider: snapshot.provider, account_id: snapshot.account_id }, { $set: snapshot }, { upsert: true, new: true, runValidators: true });
      }
    }
    group.total_achievements = await Achievement.countDocuments({ achievement_group_id: group._id });
    await group.save();
    if (failures.length) throw fail(`${failures.length} تروفی ذخیره شد اما ترجمه یا آپلود تصویرش کامل نشد؛ تلاش مجدد فقط موارد ناقص را تکمیل می‌کند.`, 502);
    return { saved: data.total, total: data.total, group_id: group._id };
  } finally { active.delete(lock); }
}
module.exports = { candidates, preview, normalizeTrophies, importTrophies, importCollection };

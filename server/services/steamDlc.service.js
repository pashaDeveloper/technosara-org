const mongoose = require('mongoose');
const Game = require('../models/game.model');
const Content = require('../models/gameContent.model');
const Product = require('../models/storeProduct.model');
const Store = require('../models/store.model');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const appId = value => {
  const id = String(value ?? '');
  if (!/^[1-9]\d{0,9}$/.test(id)) throw fail('شناسهٔ استیم معتبر نیست.');
  return id;
};
function steamId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !['store.steampowered.com', 'www.store.steampowered.com'].includes(parsed.hostname)) return null;
    const id = parsed.pathname.match(/^\/app\/([1-9]\d{0,9})(?:\/|$)/)?.[1];
    return id || null;
  } catch { return null; }
}
async function read(path, fetcher = fetch) {
  let response;
  try { response = await fetcher(`https://store.steampowered.com/api/${path}&l=english&cc=us`, { redirect: 'error', signal: AbortSignal.timeout(20000) }); }
  catch { throw fail('اتصال به استیم ناموفق بود؛ دوباره تلاش کنید.', 502); }
  if (!response.ok) throw fail(`Steam HTTP ${response.status}`, response.status === 429 ? 429 : 502);
  let size = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 8 * 1024 * 1024) throw fail('پاسخ استیم بیش از حد بزرگ است.', 502);
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw fail('پاسخ استیم معتبر نیست.', 502); }
}
async function details(id, fetcher) {
  id = appId(id);
  const row = (await read(`appdetails?appids=${id}`, fetcher))[id];
  if (!row?.success || !row.data || String(row.data.steam_appid) !== id) throw fail(`جزئیات محصول ${id} در استیم در دسترس نیست.`, 404);
  return row.data;
}
async function parentGame(id) {
  if (!mongoose.isObjectIdOrHexString(id)) throw fail('شناسهٔ بازی معتبر نیست.');
  const game = await Game.findById(id).lean();
  if (!game) throw fail('بازی پیدا نشد.', 404);
  const products = await Product.find({ game_id: id, provider: 'steam' }).lean();
  const ids = new Set(products.map(row => appId(row.external_product_id)));
  for (const row of [...(game.official_stores || []), ...(game.offers || [])]) {
    const id = steamId(row.url);
    if (id) ids.add(id);
  }
  if (!ids.size) throw fail('ابتدا لینک رسمی استیم بازی اصلی را ثبت و ذخیره کنید.');
  return { game, ids };
}
function inputParents(input = {}) {
  const ids = new Set();
  for (const key of ['official_stores', 'offers']) {
    let rows = input[key] || [];
    if (typeof rows === 'string') {
      try { rows = JSON.parse(rows); } catch { throw fail('فهرست لینک‌های فروشگاه معتبر نیست.'); }
    }
    if (!Array.isArray(rows) || rows.length > 100) throw fail('فهرست لینک‌های فروشگاه معتبر نیست.');
    for (const row of rows) {
      const id = steamId(row?.url);
      if (id) ids.add(id);
    }
  }
  if (!ids.size) throw fail('لینک رسمی استیم بازی اصلی را در بخش فروشگاه‌ها وارد کنید.');
  if (ids.size > 20) throw fail('تعداد نسخه‌های استیم بیش از حد مجاز است.');
  return ids;
}
async function discoverIds(ids, fetcher = fetch) {
  const found = new Map(), errors = [], parents = [];
  for (const parentId of ids) {
    try {
      const parent = await details(parentId, fetcher);
      if (parent.type !== 'game') throw fail(`محصول ${parentId} بازی اصلی نیست.`);
      const list = await read(`dlcforapp?appid=${parentId}`, fetcher);
      if (list.status !== 1 || String(list.appid) !== parentId || !Array.isArray(list.dlc)) throw fail('فهرست DLC استیم معتبر نیست.', 502);
      const byId = new Map(list.dlc.map(row => [appId(row.id), row]));
      const all = new Set([...(parent.dlc || []).map(appId), ...byId.keys()]);
      for (const childId of all) {
        const row = byId.get(childId);
        found.set(childId, { app_id: childId, parent_app_id: parentId, title: row?.name || `Steam ${childId}`, image: row?.header_image || '' });
      }
      parents.push({ app_id: parentId, title: parent.name, count: all.size });
    } catch (error) { errors.push({ app_id: parentId, message: error.message }); }
  }
  return { source: 'steam', market: 'US', items: [...found.values()], parents, errors, list_complete: errors.length === 0,
    notice: 'فهرست محصولات قابل مشاهده در استیم (بازار آمریکا) است؛ موارد حذف‌شده، منطقه‌ای و انحصاری کنسول ممکن است در این منبع نباشند.' };
}
async function discover(id, fetcher = fetch) {
  const { ids } = await parentGame(id);
  return discoverIds(ids, fetcher);
}
async function discoverDraft(input, fetcher = fetch) {
  return discoverIds(inputParents(input), fetcher);
}
async function previewOne(input = {}, fetcher = fetch) {
  const childId = appId(input.app_id), parentId = appId(input.parent_app_id);
  if (!inputParents(input).has(parentId)) throw fail('نسخهٔ اصلی در لینک‌های فرم وجود ندارد.');
  const parent = await details(parentId, fetcher);
  if (parent.type !== 'game') throw fail('شناسهٔ والد، بازی اصلی نیست.');
  const data = await details(childId, fetcher);
  const content = normalizeDlc(data, parentId);
  return { app_id: childId, parent_app_id: parentId, title: content.title, content, warnings: contentWarnings(content) };
}
function contentWarnings(content) {
  return [!content.release_date && 'تاریخ انتشار دقیق در منبع موجود نیست.', !content.image && 'تصویر در منبع موجود نیست.'].filter(Boolean);
}
function normalizeDlc(data, parentId) {
  if (!['dlc', 'music'].includes(data.type) || String(data.fullgame?.appid) !== appId(parentId)) throw fail('وابستگی این محتوا به بازی اصلی در استیم تأیید نشد.');
  if (!data.name?.trim() || !(data.detailed_description || data.about_the_game)?.trim()) throw fail('عنوان یا توضیحات کامل این محتوا در منبع موجود نیست.', 422);
  const date = data.release_date?.date;
  // Only parse an exact English calendar date; do not invent a date for "Coming soon" or a release window.
  const release = !data.release_date?.coming_soon && /^(?:[A-Z][a-z]{2} \d{1,2}, \d{4}|\d{1,2} [A-Z][a-z]{2},? \d{4})$/.test(date || '') ? new Date(`${date} UTC`) : null;
  return {
    type: data.type === 'music' ? 'soundtrack' : 'dlc', title: data.name,
    slug: `steam-${appId(data.steam_appid)}`, description: data.detailed_description || data.about_the_game,
    short_description: data.short_description || '', image: data.header_image || '',
    screenshots: (data.screenshots || []).map(row => row.path_full).filter(Boolean),
    videos: (data.movies || []).map(row => row.mp4?.max || row.mp4?.['480'] || row.webm?.max).filter(Boolean),
    developers: data.developers || [], publishers: data.publishers || [], supported_languages: data.supported_languages || '',
    platforms: data.platforms, release_date_text: date || '', coming_soon: Boolean(data.release_date?.coming_soon), is_free: data.is_free,
    requirements: { pc: data.pc_requirements, mac: data.mac_requirements, linux: data.linux_requirements },
    release_date: release && !Number.isNaN(release.getTime()) ? release : null,
  };
}
const active = new Set();
async function importOne(gameId, body, admin, fetcher = fetch) {
  const childId = appId(body.app_id), parentId = appId(body.parent_app_id);
  const { ids } = await parentGame(gameId);
  const savedGame = await Game.findById(gameId).lean();
  if (!ids.has(parentId)) throw fail('این شناسهٔ استیم به بازی انتخاب‌شده متصل نیست.');
  const lock = `${gameId}:${childId}`;
  if (active.has(lock)) throw fail('این محتوا در حال دریافت است؛ دوباره تلاش کنید.', 409);
  active.add(lock);
  try {
    const parent = await details(parentId, fetcher);
    if (parent.type !== 'game') throw fail('شناسهٔ والد، بازی اصلی نیست.');
    const data = await details(childId, fetcher);
    const fields = normalizeDlc(data, parentId);
    const store = await Store.findOne({ code: 'steam' });
    if (!store) throw fail('فروشگاه استیم هنوز در سیستم ثبت نشده است.', 409);
    const productFilter = { store_id: store._id, provider: 'steam', external_product_id: childId, external_sku_id: '' };
    let product = await Product.findOne(productFilter).setOptions({ withDeleted: true });
    if (product && (product.isDeleted || !product.content_id || product.game_id || product.edition_id)) throw fail('این محصول قبلاً به رکورد دیگری متصل یا حذف شده است.', 409);
    let content = product ? await Content.findById(product.content_id).setOptions({ withDeleted: true })
      : await Content.findOne({ game_id: gameId, slug: fields.slug }).setOptions({ withDeleted: true });
    if (content && (content.isDeleted || String(content.game_id) !== String(gameId))) throw fail('محتوای موجود حذف شده یا متعلق به بازی دیگری است.', 409);
    const created = !content;
    if (!content) content = new Content({ ...fields, game_id: gameId, publication_status: 'draft', creator: admin });
    // Preserve editorial fields on subsequent syncs; retain the entire current provider response.
    content.source_data = { provider: 'steam', market: 'US', language: 'english', parent_app_id: parentId, data };
    content.last_synced_at = new Date();
    await content.save();
    if (!product) {
      product = await Product.findOneAndUpdate(productFilter, { $setOnInsert: { ...productFilter, content_id: content._id, creator: admin } }, { upsert: true, new: true, runValidators: true });
      if (String(product.content_id) !== String(content._id)) throw fail('این محصول هم‌زمان به محتوای دیگری متصل شد.', 409);
    }
    product.store_title = data.name;
    product.store_url = `https://store.steampowered.com/app/${childId}`;
    product.source = 'steam'; product.is_official = true;
    const price = data.price_overview;
    if (price) product.price = { value: price.final / 100, initial: price.initial / 100, currency: price.currency, discount_percent: price.discount_percent };
    else product.price = data.is_free ? { value: 0 } : undefined;
    await product.save();
    await require('./automaticMedia.service').enrich(content, savedGame, 'dlc', fields);
    return { app_id: childId, content_id: content._id, content: content.toObject(), title: content.title, created, warnings: contentWarnings(fields) };
  } finally { active.delete(lock); }
}
module.exports = { steamId, appId, read, details, normalizeDlc, inputParents, discoverDraft, previewOne, discover, importOne };

const Game = require('../models/game.model');
const api = require('./gamebrain.service');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
function sourceId(value) {
  if (!/^\d{1,15}$/.test(String(value)) || Number(value) < 1) throw fail('شناسه Gamebrain معتبر نیست.');
  return Number(value);
}
function suggestion(doc) {
  return { id: doc.id, name: doc.title || doc.name, image: doc.image || doc.gamebrain_source?.image, saved: true, record_id: String(doc._id), publication_status: doc.publication_status };
}
async function suggestions(query) {
  const text = String(query.query || '').trim();
  if (text.length < 2) return { results: [] };
  if (text.length > 200) throw fail('عبارت جست‌وجو طولانی است.');
  const local = await Game.find({ id: { $type: 'number' }, ...require('../utils/gameTitles').gameTitleSearch(text) }).limit(20).lean();
  let remote, warning;
  try { remote = await api.lookupSuggestions({ query: text, limit: '8' }); }
  catch (error) { if (!local.length) throw error; warning = 'اطلاعات ذخیره‌شده نمایش داده می‌شود؛ منبع بیرونی در دسترس نیست.'; }
  const ids = (remote?.results || []).map(row => Number(row.id)).filter(Number.isSafeInteger);
  const known = ids.length ? await Game.find({ id: { $in: ids } }).lean() : [];
  const saved = new Map([...local, ...known].map(doc => [String(doc.id), doc]));
  const rows = api.rankSuggestions([...local.map(suggestion), ...(remote?.results || [])], text, 8, new Set((remote?.results || []).map(row => String(row.id))));
  return { results: rows.map(row => saved.has(String(row.id)) ? { ...row, ...suggestion(saved.get(String(row.id))) } : row), warning };
}
function draftValues(source, creator) {
  const id = sourceId(source.id), name = String(source.name || '').trim();
  if (!name) throw fail('نام بازی در پاسخ منبع موجود نیست.', 502);
  const values = {};
  // Preserve the complete provider response even if an optional typed field is
  // incompatible. File URLs remain references; no media is downloaded here.
  const media = new Set(['image', 'screenshots', 'videos', 'micro_trailer', 'twitch_videos', 'platform_covers', 'detail_banner', 'detail_poster', 'detail_gif']);
  for (const [key, value] of Object.entries(source)) {
    if (!Game.schema.path(key) || media.has(key) || ['_id', 'creator', 'gamebrain_source', 'publication_status', 'auto_draft', 'slug', 'status', 'approvalReview', 'isDeleted', 'deletedAt', 'createdAt', 'updatedAt', '__v'].includes(key)) continue;
    const doc = new Game({ [key]: value });
    if (!doc.validateSync([key])) values[key] = doc.get(key);
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'game';
  return { ...values, id, name, title: name, slug: `${slug}-${id}`, status: source.release_date && new Date(source.release_date) > new Date() ? 'upcoming' : 'released', publication_status: 'draft', auto_draft: true, creator, gamebrain_source: source };
}
async function select(value, creator) {
  const id = sourceId(value);
  let record = await Game.findOne({ id }).lean();
  if (record?.gamebrain_source) return { data: record.gamebrain_source, local: { record, created: false } };
  let source;
  try { source = await api.details(String(id)); }
  catch (error) { if (record) return { data: record, local: { record, created: false }, warning: error.message }; throw error; }
  if (Number(source.id) !== id) throw fail('پاسخ منبع به بازی انتخاب‌شده مربوط نیست.', 502);
  try {
    if (record) {
      await Game.updateOne({ _id: record._id }, { $set: { gamebrain_source: source } });
      return { data: source, local: { record: { ...record, gamebrain_source: source }, created: false } };
    }
    const candidate = new Game(draftValues(source, creator)); await candidate.validate();
    const values = candidate.toObject();
    for (const key of ['_id', '__v', 'createdAt', 'updatedAt']) delete values[key];
    try { record = await Game.findOneAndUpdate({ id }, { $setOnInsert: values }, { upsert: true, new: true, runValidators: true }).lean(); }
    catch (error) { if (error.code !== 11000) throw error; record = await Game.findOne({ id }).lean(); if (!record) throw error; }
    return { data: record.gamebrain_source || source, local: { record, created: true } };
  } catch { return { data: source, saveError: 'دریافت اطلاعات موفق بود، اما ذخیره خودکار انجام نشد. دوباره تلاش کنید یا ثبت نهایی را بزنید.' }; }
}
module.exports = { suggestions, select, draftValues };

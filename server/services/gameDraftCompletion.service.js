const Game = require('../models/game.model');
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
async function complete(record) {
  if (!record.auto_draft || (record.draft_completed && !record.draft_completion_errors?.length) || !record.gamebrain_source) return record;
  const source = record.gamebrain_source, updates = {}, errors = [];
  for (const [field, file, values] of [
    ['platform_ids', 'platform', source.platforms], ['genre_ids', 'genre', source.genres],
    ['theme_ids', 'theme', source.themes], ['game_mode_ids', 'gameMode', source.play_modes],
    ['tags', 'tag', source.tags], ['developer_ids', 'company', source.developer ? [source.developer] : []],
  ]) {
    if (record[field]?.length && !record.draft_completion_errors?.some(error => error.startsWith(`${field}:`))) continue;
    const Model = require(`../models/${file}.model`);
    const rows = await Model.find().lean();
    const ids = [...(record[field] || [])];
    for (const item of values || []) {
      const key = typeof item === 'object' ? item.value : null;
      const names = (typeof item === 'string' ? [item] : [item.value, item.name]).filter(Boolean).map(normalize);
      const exact = key ? rows.filter(row => row.value === key) : [];
      const matches = exact.length ? exact : rows.filter(row => [row.value, row.code, row.slug, row.short_name, row.name, row.name_en].some(value => value && names.includes(normalize(value))));
      if (matches.length === 1) ids.push(matches[0]._id);
      else errors.push(`${field}:${typeof item === 'string' ? item : item.name || item.value}`);
    }
    updates[field] = [...new Map(ids.map(id => [String(id), id])).values()];
  }
  const cache = new Map();
  for (const field of ['description', 'short_description']) {
    const text = source[field];
    if (!text?.trim() || (record[field] && record[field] !== text)) continue;
    try {
      if (!cache.has(text)) {
        const result = await require('./translation.service').translatePersian(text, undefined, { sourceLanguage: 'en', targetLanguage: 'fa', longText: true });
        if (!/[\u0600-\u06ff]/.test(result.translation || '')) throw new Error('Missing Persian translation');
        cache.set(text, result.translation);
      }
      updates[field] = cache.get(text);
    } catch { errors.push(`translation:${field}`); }
  }
  updates.draft_completion_errors = errors;
  updates.draft_completed = errors.length === 0;
  const saved = await Game.findOneAndUpdate({ _id: record._id, auto_draft: true }, { $set: updates }, { new: true, runValidators: true }).lean();
  return saved || record;
}
module.exports = { complete };

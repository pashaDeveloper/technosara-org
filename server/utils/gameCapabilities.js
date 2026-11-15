const definitions = [
  ['single_player', 'تک‌نفره', 'mode', ['single_player', 'single-player']],
  ['online_multiplayer', 'چندنفرهٔ آنلاین', 'mode', ['online_multiplayer', 'online multi-player', 'online multiplayer']],
  ['local_multiplayer', 'چندنفرهٔ محلی', 'mode', ['local_multiplayer', 'local multi-player', '4 player local']],
  ['online_coop', 'همکاری آنلاین', 'mode', ['online_coop', 'online co-op']],
  ['local_coop', 'همکاری محلی', 'mode', ['local_coop', 'local co-op']],
  ['crossplay', 'بازی بین پلتفرمی', 'feature', ['crossplay', 'cross-platform multiplayer', 'cross-platform play']],
  ['cross_save', 'انتقال ذخیره بین پلتفرم‌ها', 'feature', ['cross_save', 'cross-save']],
  ['cloud_saves', 'ذخیرهٔ ابری', 'feature', ['cloud_saves', 'cloud saves', 'steam cloud']],
  ['achievements', 'تروفی و اچیومنت', 'feature', ['achievements', 'steam achievements', 'trophies']],
  ['hdr', 'HDR', 'platform', []],
  ['4k', '4K', 'platform', []],
  ['120fps', '۱۲۰ فریم بر ثانیه', 'platform', []],
  ['vr', 'واقعیت مجازی', 'platform', []],
  ['ray_tracing', 'رهگیری پرتو (Ray Tracing)', 'platform', []],
].map(([key, label, group, aliases]) => ({ key, label, group, aliases }));
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const aliasesFor = item => [item.key, ...item.aliases].map(normalize);
const matches = (row, item) => [row.value, row.code, row.slug, row.name, row.name_en].some(value => value && aliasesFor(item).includes(normalize(value)));
const infer = source => Object.fromEntries(definitions.filter(item => item.group !== 'platform').filter(item => {
  const rows = item.group === 'mode' ? source.play_modes : source.tags;
  return Array.isArray(rows) && rows.some(row => typeof row === 'string' ? aliasesFor(item).includes(normalize(row)) : matches(row, item));
}).map(item => [item.key, true]));
const invalid = () => Object.assign(new Error('اطلاعات قابلیت‌های بازی معتبر نیست.'), { status: 400 });
function parse(value) { try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { throw invalid(); } }
function validateStates(value, group) {
  const states = parse(value);
  if (!states || typeof states !== 'object' || Array.isArray(states)) throw invalid();
  for (const [key, state] of Object.entries(states)) {
    if (!definitions.some(item => item.key === key && (group === 'platform' ? item.group === group : item.group !== 'platform')) || ![true, false, null].includes(state)) throw invalid();
  }
  return Object.fromEntries(Object.entries(states).map(([key, state]) => [key, state === true]));
}
async function capabilityValues(body, existing = {}) {
  const values = {};
  if (body.capability_status !== undefined) values.capability_status = validateStates(body.capability_status, 'global');
  if (body.platform_capabilities !== undefined) {
    const rows = parse(body.platform_capabilities);
    const mongoose = require('mongoose');
    if (!Array.isArray(rows) || rows.length > 100 || new Set(rows.map(row => String(row?.platform_id))).size !== rows.length) throw invalid();
    if (body.platform_ids !== undefined) {
      const selected = parse(body.platform_ids);
      if (!Array.isArray(selected) || rows.some(row => !selected.map(String).includes(String(row?.platform_id)))) throw invalid();
    }
    const Platform = require('../models/platform.model');
    for (const row of rows) {
      if (!row || !mongoose.isObjectIdOrHexString(row.platform_id)) throw invalid();
      validateStates(row.status, 'platform');
    }
    if (rows.length && await Platform.countDocuments({ _id: { $in: rows.map(row => row.platform_id) } }) !== rows.length) throw invalid();
    values.platform_capabilities = rows.map(row => ({ platform_id: row.platform_id, status: validateStates(row.status, 'platform') }));
  }
  if (!Object.keys(values).length) return values;
  for (const [field, modelName, group] of [['game_mode_ids', 'gameMode', 'mode'], ['feature_ids', 'feature', 'feature']]) {
    const Model = require(`../models/${modelName}.model`);
    const rows = await Model.find({ isDeleted: false });
    const ids = new Set((parse(body[field] ?? existing[field] ?? []) || []).map(String));
    for (const item of definitions.filter(item => group === 'mode' ? item.group === group : item.group !== 'mode')) {
      const states = values.capability_status || existing.capability_status || {};
      const platforms = values.platform_capabilities || existing.platform_capabilities || [];
      if (item.group === 'platform' && ![...platforms, ...(existing.platform_capabilities || [])].some(row => row.status?.[item.key] !== undefined)) continue;
      const state = item.group === 'platform' ? platforms.some(row => row.status?.[item.key] === true) : states[item.key];
      if (state === undefined) continue;
      const found = rows.filter(row => matches(row, item));
      for (const row of found) ids.delete(String(row._id));
      if (state !== true) continue;
      if (found.length > 1) throw Object.assign(new Error(`چند گزینه برای ${item.label} ثبت شده است.`), { status: 409 });
      let doc = found[0];
      if (!doc) {
        const identity = group === 'mode' ? 'slug' : 'code';
        try { doc = await Model.findOneAndUpdate({ [identity]: item.key, isDeleted: false }, { $setOnInsert: { name: item.label, name_en: item.key, [identity]: item.key } }, { upsert: true, new: true, runValidators: true }); }
        catch (error) { if (error.code !== 11000) throw error; doc = await Model.findOne({ [identity]: item.key, isDeleted: false }); if (!doc) throw error; }
      }
      ids.add(String(doc._id));
    }
    values[field] = [...ids];
  }
  return values;
}
module.exports = { definitions, infer, validateStates, capabilityValues, matches };

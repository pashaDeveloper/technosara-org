const mongoose = require('mongoose');
const { ExternalTerm } = require('../models/catalog.model');
const { fail } = require('./catalog.service');
const models = { company: 'Company', genre: 'Genre', platform: 'Platform', store: 'Store', feature: 'Feature', brand: 'Brand' };
require('../models/brand.model');
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[™®©]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const synonyms = { windows: ['pc', 'windows', 'microsoft windows'], mac: ['mac', 'macos'], linux: ['linux'], ps4: ['ps4', 'playstation 4'], ps5: ['ps5', 'playstation 5'], xbox: ['xbox', 'xbox store', 'microsoft store'], 'playstation store': ['playstation store', 'ps store'], XblOnlineMultiPlayer: ['online_multiplayer'], XblOnlineCoop: ['online_coop'], CapabilityHDR: ['hdr'], Capability4k: ['4k'], XPA: ['xbox_play_anywhere'] };
async function options(type) {
  if (!models[type]) throw fail('Invalid entity type');
  return mongoose.model(models[type]).find({}).select('name name_en title code slug').sort({ name: 1 }).lean();
}
async function resolve(provider, type, key, label) {
  let term = await ExternalTerm.findOne({ provider, entity_type: type, external_key: String(key) });
  if (!term) {
    try { term = await ExternalTerm.create({ provider, entity_type: type, external_key: String(key), label }); }
    catch (error) { if (error.code !== 11000) throw error; term = await ExternalTerm.findOne({ provider, entity_type: type, external_key: String(key) }); }
  }
  const records = await options(type);
  if (term.resolution === 'mapped' && term.target_ids.every(id => records.some(row => String(row._id) === String(id)))) return { ...term.toObject(), choices: records, match: 'saved' };
  if (term.resolution === 'ignored') return { ...term.toObject(), choices: records, match: 'ignored' };
  const names = [label, key, ...(synonyms[key] || synonyms[normalize(label)] || [])].map(normalize);
  const exact = records.filter(row => [row.name, row.name_en, row.title, row.code, row.slug].filter(Boolean).some(value => names.includes(normalize(value))));
  const targets = exact.length === 1 ? [exact[0]._id] : [];
  // Fuzzy values are suggestions only; never overwrite an internal identity.
  const words = new Set(normalize(label).split(' '));
  const suggested = records.map(row => ({ id: row._id, score: normalize(row.name_en || row.name || row.code).split(' ').filter(w => words.has(w)).length })).filter(row => row.score > 0).sort((a, b) => b.score - a.score).slice(0, 5).map(row => row.id);
  return { ...term.toObject(), target_ids: targets, resolution: targets.length ? 'mapped' : 'pending', choices: records, suggestions: suggested, match: targets.length ? 'exact' : 'review' };
}
async function confirm(id, ids, ignore, admin) {
  const term = await ExternalTerm.findById(id); if (!term) throw fail('Term not found', 404);
  if (!Array.isArray(ids) || ids.length > 30 || ids.some(id => !mongoose.isObjectIdOrHexString(id))) throw fail('Invalid mapping IDs');
  ids = [...new Set(ids)];
  if (!ignore && !ids.length) throw fail('Choose an existing record');
  if (ignore && ['store', 'platform'].includes(term.entity_type)) throw fail('Store/platform mappings are required');
  if (term.entity_type === 'store' && ids.length !== 1) throw fail('Choose one store');
  if (await mongoose.model(models[term.entity_type]).countDocuments({ _id: { $in: ids } }) !== ids.length) throw fail('Mapping target missing or deleted');
  term.target_ids = ignore ? [] : ids; term.resolution = ignore ? 'ignored' : 'mapped'; term.reviewed_by = admin; await term.save(); return term;
}
module.exports = { resolve, confirm, normalize, options };

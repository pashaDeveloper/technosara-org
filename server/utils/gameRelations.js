// Model discovery follows the ObjectId relationships declared on Game.
const Game = require('../models/game.model');
const catalogs = Object.fromEntries(Object.values(Game.schema.paths).flatMap(path => {
  const options = path.caster?.options;
  return options?.providerFilter ? [[options.providerFilter, {
    Model: require(`../models/${options.modelFile}.model`), resource: options.resource,
  }]] : [];
}));
const identityField = Model => Model.schema.path('code') ? 'code' : 'slug';
const slug = value => String(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
// Comparison normalizes punctuation, but never fuzzily matches different names.
const normalize = value => slug(value || '');
function candidate(rows, item, Model) {
  const byKey = rows.filter(row => row.value === item.key);
  if (byKey.length > 1) throw Object.assign(new Error(`Duplicate ${Model.modelName} key: ${item.key}`), { status: 409 });
  if (byKey.length) return byKey[0];
  const identity = identityField(Model);
  const matches = rows.filter(row => normalize(row[identity]) === normalize(item.key) || [row.name, row.name_en].some(name => name && normalize(name) === normalize(item.name)));
  if (matches.length > 1) throw Object.assign(new Error(`Ambiguous ${Model.modelName} mapping: ${item.name}`), { status: 409 });
  const doc = matches[0];
  if (doc?.value && doc.value !== item.key) throw Object.assign(new Error(`Conflicting ${Model.modelName} key: ${item.key}`), { status: 409 });
  return doc;
}
module.exports = { catalogs, identityField, slug, candidate };

const mongoose = require('mongoose');
const Game = require('../models/game.model');
const fields = Object.fromEntries(Object.entries(Game.schema.paths).flatMap(([field, path]) => {
  const options = path.caster?.options;
  return options?.providerFilter ? [[field, require(`../models/${options.modelFile}.model`)]] : [];
}));
fields.game_series_ids = require('../models/gameSeries.model');
const invalid = field => Object.assign(new Error('مقدار یا شناسه نامعتبر: ' + field), { status: 400 });
const validId = id => typeof id === 'string' && mongoose.isObjectIdOrHexString(id);
exports.gameClassificationValues = async body => {
  const values = {};
  for (const [field, Model] of Object.entries(fields)) {
    if (body[field] === undefined) continue;
    let ids = body[field];
    if (typeof ids === 'string') {
      try { ids = JSON.parse(ids); } catch { throw invalid(field); }
    }
    if (!Array.isArray(ids) || !ids.every(validId)) throw invalid(field);
    ids = [...new Set(ids.map(id => id.toLowerCase()))];
    if (ids.length && await Model.countDocuments({ _id: { $in: ids } }) !== ids.length) throw invalid(field);
    values[field] = ids;
  }
  return values;
};
exports.gameClassificationFilters = query => {
  const filters = {};
  for (const [param, field] of [['game_mode_id', 'game_mode_ids'], ['game_series_id', 'game_series_ids'], ['theme_id', 'theme_ids']]) {
    if (query[param] === undefined) continue;
    if (!validId(query[param])) throw invalid(param);
    filters[field] = query[param];
  }
  return filters;
};

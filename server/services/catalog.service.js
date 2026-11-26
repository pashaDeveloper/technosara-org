const mongoose = require('mongoose');
const Game = require('../models/game.model');
const retailReferences = require('../models/retailReferences.models');
const resources = {
  'filter-options': require('../models/filterOption.model'),
  'sorting-options': require('../models/sortingOption.model'),
  ...Object.fromEntries(Object.values(require('../utils/gameRelations').catalogs).map(({ Model, resource }) => [resource, Model])),
  themes: require('../models/theme.model'),
  news: require('../models/news.model'),
  editions: require('../models/edition.model'),
  'game-platforms': require('../models/gamePlatform.model'),
  'store-products': require('../models/storeProduct.model'),
  'retail-products': require('../models/retailProduct.model'),
  'retail-brands': retailReferences.brands,
  'retail-categories': retailReferences.categories,
  'retail-stores': retailReferences.stores,
  'game-contents': require('../models/gameContent.model'),
  'achievement-groups': require('../models/achievementGroup.model'),
  'achievements': require('../models/achievement.model'),
  'media': require('../models/media.model'),
  'age-ratings': require('../models/ageRating.model'),
};
// Load targets before validating references, including when this service is used by a worker.
for (const file of ['platform', 'store', 'brand', 'gameContent', 'company', 'admin', 'feature', 'media', 'ageRating', 'achievement', 'achievementGroup', 'genre', 'gameMode', 'gameSeries']) {
  if (file !== 'feature') require(`../models/${file}.model`);
}
const readOnly = new Set();
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const same = (a, b) => String(a) === String(b);
function writable(Model, body) {
  const blocked = new Set(['_id', '__v', 'creator', 'isDeleted', 'deletedAt', 'createdAt', 'updatedAt', 'approvalReview']);
  return Object.fromEntries(Object.entries(body).filter(([key]) => Model.schema.path(key) && !blocked.has(key)));
}
async function validateReferences(doc) {
  await doc.validate();
  for (const [key, path] of Object.entries(doc.schema.paths)) {
    const reference = path.options.ref || path.caster?.options?.ref;
    const target = typeof reference === 'function' ? reference.call(doc) : reference;
    if (!target || key === 'creator') continue;
    const values = [doc.get(key)].flat().filter(Boolean);
    for (const value of values) if (!await mongoose.model(target).exists({ _id: value })) throw fail(`Invalid or deleted reference: ${key}`);
  }
  if (doc.dlc_id) {
    const dlc = await mongoose.model('GameContent').findById(doc.dlc_id);
    if (!dlc || !same(dlc.game_id, doc.game_id) || ['edition', 'bundle', 'subscription', 'demo', 'trial'].includes(dlc.type)) throw fail('DLC and record must belong to the same game');
  }
  if (doc.achievement_group_id) {
    const group = await mongoose.model('AchievementGroup').findById(doc.achievement_group_id);
    if (!same(group.game_id, doc.game_id) || !same(group.platform_id, doc.platform_id)) throw fail('Achievement must match its group game and platform');
  }
  await require('../utils/contentReferences').validateContentReferences(doc);
}
function filters(Model, query) {
  const filter = {};
  for (const [key, value] of Object.entries(query)) {
    if (['page', 'limit', 'search'].includes(key)) continue;
    const path = Model.schema.path(key);
    if (!path || ['isDeleted', 'payload_json', 'normalized'].includes(key)) continue;
    if (typeof value !== 'string') throw fail(`Invalid filter: ${key}`);
    if (path.instance === 'ObjectId' && !mongoose.isObjectIdOrHexString(value)) throw fail(`Invalid ID: ${key}`);
    filter[key] = value;
  }
  if (query.search) {
    if (Model === Game) return { ...filter, ...require('../utils/gameTitles').gameTitleSearch(query.search) };
    if (typeof query.search !== 'string') throw fail('Invalid search');
    const fields = ['name', 'title', 'store_title', 'code', 'external_product_id', 'external_id'].filter(key => Model.schema.path(key));
    if (fields.length) filter.$or = fields.map(key => ({ [key]: { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }));
  }
  return filter;
}
async function list(Model, query) {
  const filter = filters(Model, query);
  const page = Math.max(1, parseInt(query.page, 10) || 1), limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const records = Model.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit);
  const [data, total] = await Promise.all([records, Model.countDocuments(filter)]);
  return { acknowledgement: true, data, total, page, limit };
}
async function save(Model, body, admin, id) {
  const doc = id ? await Model.findById(id) : new Model({ creator: admin });
  if (!doc) throw fail('Record not found', 404);
  if (id && Model.modelName === 'GameContent' && ((body.game_id !== undefined && !same(body.game_id, doc.game_id)) || (body.type !== undefined && body.type !== doc.type))) await assertDeletable(Model, id);
  doc.set(writable(Model, body));
  if (Model.schema.path('slug') && !doc.slug && doc.name_en) doc.slug = require('../utils/slug').generateSlug(doc.name_en);
  await validateReferences(doc);
  await doc.save();
  return doc;
}
async function assertDeletable(Model, id, { cascadingModels = [] } = {}) {
  if (['Game', 'GameContent', 'Edition'].includes(Model.modelName)) {
    const field = Model.modelName === 'Game' ? 'items.game_id' : Model.modelName === 'Edition' ? 'items.edition_id' : 'items.content_id';
    if (await mongoose.model('GameContent').exists({ [field]: id })) throw fail('Record is referenced by content items', 409);
  }
  for (const Related of Object.values(mongoose.models)) {
    if (cascadingModels.includes(Related.modelName)) continue;
    if (['RawResponse', 'SyncLog', 'MatchReview', 'ImportJob', 'FieldSource'].includes(Related.modelName)) continue;
    const fields = Object.entries(Related.schema.paths).filter(([, path]) => {
      const reference = path.options.ref || path.caster?.options?.ref;
      return reference === Model.modelName || typeof reference === 'string' && mongoose.models[reference]?.modelName === Model.modelName;
    }).map(([key]) => key);
    if (fields.length && await Related.exists({ $or: fields.map(key => ({ [key]: id })) })) throw fail(`Record is referenced by ${Related.modelName}; remove the relationship first`, 409);
  }
}
async function detail(id, { internal = false } = {}) {
  const gameQuery = Game.findById(id).populate('genre_ids game_mode_ids game_series_ids theme_ids developer_ids publisher_ids cover_media_id');
  const achievementsQuery = mongoose.model('Achievement').find({ game_id: id });
  if (!internal) {
    gameQuery.populate('platform_ids', 'code name');
    achievementsQuery.populate('platform_id', 'code name');
  }
  const game = await gameQuery.lean();
  if (!game || (!internal && game.publication_status !== 'published')) throw fail('Game not found', 404);
  const query = { game_id: id };
  const [editions, game_platforms, contents, media, age_ratings, groups, achievements, store_products, news, similar_games] = await Promise.all([
    mongoose.model('Edition').find(query).lean(),
    mongoose.model('GamePlatform').find(query).populate('platform_id').lean(),
    mongoose.model('GameContent').find({ $or: [{ game_id: id }, { 'items.game_id': id }], ...(!internal ? { publication_status: 'published' } : {}) }).lean(),
    mongoose.model('Media').find(query).sort({ sort_order: 1 }).lean(),
    mongoose.model('AgeRating').find(query).lean(), mongoose.model('AchievementGroup').find(query).lean(),
    achievementsQuery.lean(),
    mongoose.model('StoreProduct').find(query).populate('store_id').lean(),
    mongoose.model('News').find(query).sort({ published: -1 }).lean(),
    require('./gameSimilar.service').catalogSimilar(game),
  ]);

  if (!game.genres) game.genres = (game.genre_ids || []).filter(item => item.value || item.value).map(item => ({ value: item.value || item.value, name: item.name }));
  game.game_modes = game.game_mode_ids;
  game.series = game.game_series_ids;
  game.developers = game.developer_ids || [];
  game.publisher = game.publisher_ids || [];
  return { ...game, editions, game_platforms, contents, media, age_ratings, achievement_groups: groups, achievements, store_products, news, similar_games };
}
module.exports = { resources, readOnly, fail, writable, validateReferences, filters, list, save, detail, assertDeletable };

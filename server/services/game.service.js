const { validateGameIdentity } = require("../utils/gameIdentity");
const { gameClassificationValues, gameClassificationFilters } = require('../utils/gameClassifications');
const Game = require("../models/game.model");
const { filterScreenshots } = require('../utils/gameScreenshots');
const { alternateTitleValues, gameTitleSearch } = require('../utils/gameTitles');
const { fillSimilarIds } = require('./gameSimilar.service');

/* add new game */
exports.addGame = async (req, res) => {
  try {
    const { body } = req;
    await validateGameIdentity(body);
    const providerValues = require('../utils/gamebrainValues').gamebrainValues(body);
    await fillSimilarIds(providerValues);
    const game = new Game({
      ...await gameClassificationValues(body),
      ...providerValues,
      ...alternateTitleValues(body),
      ...await require('../utils/gameCapabilities').capabilityValues(body),
      status: body.status,
      publication_status: body.publication_status,
      title: body.name ?? body.title,
      slug: body.slug,
      sort_title: body.sort_title,
      short_description: body.short_description,
      description: body.description,
      release_date: body.release_date,
      official_website: body.official_website,
      has_persian_subtitles: body.has_persian_subtitles,
      has_dubbing: body.has_dubbing,
      has_game_pass: body.has_game_pass,
      has_ps_plus: body.has_ps_plus,
      developer_ids: typeof body.developer_ids === "string" ? JSON.parse(body.developer_ids || "[]") : body.developer_ids,
      publisher_ids: typeof body.publisher_ids === "string" ? JSON.parse(body.publisher_ids || "[]") : body.publisher_ids,
      cover_media_id: body.cover_media_id,
      genre_ids: typeof body.genre_ids === "string" ? JSON.parse(body.genre_ids || "[]") : body.genre_ids,
      creator: req.admin._id
    });

    if (body.screenshots !== undefined) game.screenshots = await filterScreenshots(game.screenshots);
    await game.save();

    res.status(201).json({
      acknowledgement: true,
      message: "Created",
      data: { _id: game._id },
      description: "بازی با موفقیت ایجاد شد"
    });
  } catch (error) {
    if (['ValidationError', 'CastError'].includes(error.name)) error.status = 400;
    if (error.code === 11000) error.status = 409;
    if (error.status) return res.status(error.status).json({ acknowledgement: false, message: error.message });
    if (error.status === 400) return res.status(400).json({ acknowledgement: false, message: error.message });
    console.error("Error in addGame:", error);
    res.status(500).json({
      acknowledgement: false,
      message: "Internal Server Error",
      description: "خطا در ایجاد بازی",
      error: error.message
    });
  }
};

/* get all games */
const storefrontFields = {
  genre: ['genre_ids', 'genre'],
  developer: ['developer_ids', 'company'],
  theme: ['theme_ids', 'theme'],
  age: ['content_rating_ids', 'contentRating'],
  platform: ['platform_ids', 'platform']
};
const published = { publication_status: 'published' };
const visiblePlatform = { isSHow: true };
const Platform = require('../models/platform.model');

exports.getStorefrontFilters = async () => {
  const groups = await Promise.all(Object.entries(storefrontFields).map(async ([key, [field, model]]) => {
    const options = key === 'platform'
      ? await Platform.find(visiblePlatform).select('name name_fa name_en').sort({ sort_order: 1, name: 1 }).lean()
      : await require(`../models/${model}.model`).find({ _id: { $in: await Game.distinct(field, published) } })
        .select('name name_fa name_en').sort({ name: 1 }).lean();
    return [key === 'age' ? 'ages' : `${key}s`, options.map(option => ({
      id: option._id, title: option.name_fa || option.name || option.name_en
    }))];
  }));
  return Object.fromEntries(groups);
};

exports.getGames = async (req, res, { storefront = false } = {}) => {
  try {
    const { page = 1, limit, search = "" } = req.query;
    const pageNum = storefront ? Math.max(1, parseInt(page) || 1) : parseInt(page) || 1;
    const limitNum = storefront ? Math.min(100, Math.max(1, parseInt(limit) || 24)) : parseInt(limit) || 5;
    const skip = (pageNum - 1) * limitNum;

    const query = gameClassificationFilters(req.query);
    if (storefront) {
      Object.assign(query, published);
      for (const [key, [field]] of Object.entries(storefrontFields)) {
        const value = req.query[key];
        if (value === undefined) continue;
        if (typeof value !== 'string' || !require('mongoose').isObjectIdOrHexString(value)) {
          return res.status(400).json({ message: 'شناسه فیلتر معتبر نیست' });
        }
        query[field] = value;
      }
      const platformIds = await Platform.distinct('_id', visiblePlatform);
      if (query.platform_ids) {
        query.platform_ids = { $in: platformIds.filter(id => String(id) === query.platform_ids.toLowerCase()) };
      } else if (platformIds.length) {
        query.platform_ids = { $in: platformIds };
      }
    }
    if (req.query.collection_id) {
      if (!require('mongoose').isObjectIdOrHexString(req.query.collection_id)) return res.status(400).json({ message: 'شناسه کالکشن معتبر نیست' });
      const collection = await require('../models/collection.model').findById(req.query.collection_id).select('game_ids');
      query._id = { $in: collection?.game_ids || [] };
    }
    if (req.query.game_tag_id || req.query.related_to) {
      const filter = await require('../utils/gameTagFilter').gameTagFilter(req.query);
      if (query._id) query.$and = [{ _id: query._id }, { _id: filter }];
      else query._id = filter;
      if (query.$and) delete query._id;
    }
    const { $and: capabilityConditions, ...capabilityFields } = await require('../utils/gameCapabilities').capabilityFilter(req.query.capability);
    Object.assign(query, capabilityFields);
    if (capabilityConditions) query.$and = [...(query.$and || []), ...capabilityConditions];
    if (search) {
      Object.assign(query, gameTitleSearch(search));
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    const gamesQuery = Game.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort(storefront ? { release_date: -1, _id: -1 } : { createdAt: -1, _id: -1 })
      .populate({ path: "cover_media_id", select: "url" });
    if (storefront) gamesQuery.select("title short_description image cover_media_id rating");
    else gamesQuery
      .populate({ path: "platform_ids", select: "name name_en code" })
      .populate({ path: "developer_ids", select: "name name_fa name_en slug" })
      .populate({ path: "publisher_ids", select: "name name_fa name_en slug" })
      .populate({ path: "genre_ids", select: "name name_fa name_en slug" })
      .populate({ path: "game_mode_ids", select: "name name_fa name_en slug" })
      .populate({ path: "game_series_ids", select: "name name_en short_name slug" })
      .populate({ path: "theme_ids", select: "name name_fa name_en slug value" })
      .populate({ path: "creator", select: "name avatar" });
    const games = await gamesQuery;
    const total = await Game.countDocuments(query);

    res.status(200).json({
      acknowledgement: true,
      message: "Ok",
      description: "فهرست بازی با موفقیت دریافت شد",
      data: games,
      total
    });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ acknowledgement: false, message: error.message });
    console.error("Error in getGames:", error);
    return res.status(500).json({
      acknowledgement: false,
      message: "خطا در دریافت بازی",
      description: error.message || error.toString()
    });
  }
};

/* get a game */
exports.getGame = async (req, res) => {
  const game = await Game.findById(req.params.id);
  if (!game) return res.status(404).json({ acknowledgement: false, message: 'بازی پیدا نشد' });
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "بازی با موفقیت دریافت شد",
    data: { ...game.toObject(), saved_resources: await require('./savedGameResources.service').read(game._id) }
  });
};

/* update game */
exports.updateGame = async (req, res) => {
  const { body } = req;
  await validateGameIdentity(body);
  const existingCapabilities = await Game.findById(req.params.id).select('id similar_ids similar_previews capability_status platform_capabilities game_mode_ids feature_ids screenshots');
  if (!existingCapabilities) return res.status(404).json({ acknowledgement: false, message: 'بازی پیدا نشد' });
  const providerValues = require('../utils/gamebrainValues').gamebrainValues(body);
  await fillSimilarIds(providerValues, existingCapabilities);
  const updatedGame = {
    auto_draft: false,
    ...await gameClassificationValues(body),
    ...providerValues,
    ...alternateTitleValues(body),
    ...await require('../utils/gameCapabilities').capabilityValues(body, existingCapabilities || {}),
    status: body.status,
    publication_status: body.publication_status,
    title: body.name ?? body.title,
    slug: body.slug,
    sort_title: body.sort_title,
    short_description: body.short_description,
    description: body.description,
    release_date: body.release_date,
    official_website: body.official_website,
    ...Object.fromEntries(['has_persian_subtitles', 'has_dubbing', 'has_game_pass', 'has_ps_plus']
      .filter(key => Object.hasOwn(body, key))
      .map(key => [key, body[key]])),
    developer_ids: typeof body.developer_ids === "string" ? JSON.parse(body.developer_ids || "[]") : body.developer_ids,
    publisher_ids: typeof body.publisher_ids === "string" ? JSON.parse(body.publisher_ids || "[]") : body.publisher_ids,
    cover_media_id: body.cover_media_id,
    genre_ids: typeof body.genre_ids === "string" ? JSON.parse(body.genre_ids || "[]") : body.genre_ids
  };

  if (updatedGame.screenshots !== undefined) {
    updatedGame.screenshots = await filterScreenshots(updatedGame.screenshots, existingCapabilities?.screenshots);
  }
  const game = await Game.findByIdAndUpdate(req.params.id, updatedGame, { runValidators: true });
  if (!game) return res.status(404).json({ acknowledgement: false, message: 'بازی پیدا نشد' });
  const previous = game.toObject ? game.toObject() : game;
  const failures = await require('./gameImageCleanup.service').cleanup(previous, { ...previous, ...Object.fromEntries(Object.entries(updatedGame).filter(([, value]) => value !== undefined)) });
  if (failures.length) res.setHeader('X-Image-Cleanup-Pending', 'true');

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "بازی با موفقیت ویرایش شد"
  });
};

/* delete game */
exports.deleteGame = async (req, res) => {
  await require('./catalog.service').assertDeletable(Game, req.params.id, { cascadingModels: ['Media', 'GamePlatform'] });
  const existingGame = await Game.findById(req.params.id);
  if (!existingGame) return res.status(404).json({ acknowledgement: false, message: 'بازی پیدا نشد' });

  await require('../models/media.model').deleteMany({ game_id: existingGame._id });
  await require('../models/gamePlatform.model').deleteMany({ game_id: existingGame._id });
  const game = await Game.findByIdAndDelete(req.params.id);

  if (!game) {
    return res.status(404).json({
      acknowledgement: false,
      message: "بازی پیدا نشد",
      description: "بازی که می‌خواهید حذف کنید، وجود ندارد"
    });
  }

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "بازی با موفقیت حذف شد"
  });
};

exports.getGameOptions = async (req, res) => {
  const games = await Game.find(gameTitleSearch(req.query?.search)).select("title slug alternate_titles");
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فهرست بازی با موفقیت دریافت شد",
    data: games
  });
};

exports.createGame = exports.addGame;

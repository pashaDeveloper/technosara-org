const service = require('../services/gamebrain.service');

exports.getGames = async (req, res, next) => {
  try { await service.getGames(req, res); } catch (error) { next(error); }
};
exports.getSuggestions = async (req, res, next) => {
  try { await service.getSuggestions(req, res); } catch (error) { next(error); }
};
exports.getGame = async (req, res, next) => {
  try { await service.getGame(req, res); } catch (error) { next(error); }
};
exports.getSimilar = async (req, res, next) => {
  try { await service.getSimilar(req, res); } catch (error) { next(error); }
};
exports.getSimilarForForm = async (req, res, next) => {
  try {
    const results = await require('../services/gameSimilar.service').adminSimilar(req.params.id, req.body);
    res.json({ data: { results } });
  } catch (error) { next(error); }
};
exports.getNews = async (req, res, next) => {
  try { await service.getNews(req, res); } catch (error) { next(error); }
};
exports.getFilters = async (req, res, next) => {
  try { await service.getFilters(req, res); } catch (error) { next(error); }
};

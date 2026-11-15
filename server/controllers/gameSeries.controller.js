const service = require('../services/gameSeries.service');
exports.reorderGameSeries = async (req, res, next) => {
  try { await service.reorderGameSeries(req, res); } catch (error) { next(error); }
};
exports.getGameSeriesOptions = async (req, res, next) => {
  try {
    await service.getGameSeriesOptions(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getGameSeriesEntries = async (req, res, next) => {
  try {
    await service.getGameSeriesEntries(req, res);
  } catch (error) {
    next(error);
  }
};
exports.createGameSeries = async (req, res, next) => {
  try {
    await service.createGameSeries(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};
exports.updateGameSeries = async (req, res, next) => {
  try {
    await service.updateGameSeries(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};
exports.deleteGameSeries = async (req, res, next) => {
  try {
    await service.deleteGameSeries(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getGameSeries = async (req, res, next) => {
  try {
    await service.getGameSeries(req, res);
  } catch (error) {
    next(error);
  }
};

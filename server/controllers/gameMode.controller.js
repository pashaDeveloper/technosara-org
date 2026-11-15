const service = require('../services/gameMode.service');
exports.reorderGameMode = async (req, res, next) => {
  try { await service.reorderGameMode(req, res); } catch (error) { next(error); }
};
exports.getGameModeOptions = async (req, res, next) => {
  try {
    await service.getGameModeOptions(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getGameModes = async (req, res, next) => {
  try {
    await service.getGameModes(req, res);
  } catch (error) {
    next(error);
  }
};
exports.createGameMode = async (req, res, next) => {
  try {
    await service.createGameMode(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};
exports.updateGameMode = async (req, res, next) => {
  try {
    await service.updateGameMode(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};
exports.deleteGameMode = async (req, res, next) => {
  try {
    await service.deleteGameMode(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getGameMode = async (req, res, next) => {
  try {
    await service.getGameMode(req, res);
  } catch (error) {
    next(error);
  }
};

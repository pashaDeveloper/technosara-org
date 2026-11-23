const service = require('../services/gameTag.service');
exports.localizeGameTags = async (req, res, next) => {
  try { await service.localizeGameTags(req, res); } catch (error) { next(error); }
};
exports.reorderGameTag = async (req, res, next) => {
  try { await service.reorderGameTag(req, res); } catch (error) { next(error); }
};
exports.getGameTagOptions = async (req, res, next) => {
  try {
    await service.getGameTagOptions(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getGameTags = async (req, res, next) => {
  try {
    await service.getGameTags(req, res);
  } catch (error) {
    next(error);
  }
};
exports.createGameTag = async (req, res, next) => {
  try {
    await service.createGameTag(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};
exports.updateGameTag = async (req, res, next) => {
  try {
    await service.updateGameTag(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};
exports.deleteGameTag = async (req, res, next) => {
  try {
    await service.deleteGameTag(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getGameTag = async (req, res, next) => {
  try {
    await service.getGameTag(req, res);
  } catch (error) {
    next(error);
  }
};

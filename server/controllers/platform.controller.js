const service = require('../services/platform.service');
exports.reorderPlatforms = async (req, res, next) => {
  try {
    await service.reorderPlatforms(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getPlatformOptions = async (req, res, next) => {
  try {
    await service.getPlatformOptions(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getPlatforms = async (req, res, next) => {
  try {
    await service.getPlatforms(req, res);
  } catch (error) {
    next(error);
  }
};
exports.createPlatform = async (req, res, next) => {
  try {
    await service.createPlatform(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};
exports.updatePlatform = async (req, res, next) => {
  try {
    await service.updatePlatform(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};
exports.deletePlatform = async (req, res, next) => {
  try {
    await service.deletePlatform(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getPlatform = async (req, res, next) => {
  try {
    await service.getPlatform(req, res);
  } catch (error) {
    next(error);
  }
};

const service = require('../services/collection.service');
exports.reorderCollection = async (req, res, next) => {
  try { await service.reorderCollection(req, res); } catch (error) { next(error); }
};
exports.getCollectionOptions = async (req, res, next) => {
  try {
    await service.getCollectionOptions(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getCollections = async (req, res, next) => {
  try {
    await service.getCollections(req, res);
  } catch (error) {
    next(error);
  }
};
exports.createCollection = async (req, res, next) => {
  try {
    await service.createCollection(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};
exports.updateCollection = async (req, res, next) => {
  try {
    await service.updateCollection(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};
exports.deleteCollection = async (req, res, next) => {
  try {
    await service.deleteCollection(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getCollection = async (req, res, next) => {
  try {
    await service.getCollection(req, res);
  } catch (error) {
    next(error);
  }
};

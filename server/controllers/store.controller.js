const service = require('../services/store.service');
exports.getStoreCountries = service.getStoreCountries;
exports.reorderStore = async (req, res, next) => {
  try { await service.reorderStore(req, res); } catch (error) { next(error); }
};
exports.getStoreOptions = async (req, res, next) => {
  try {
    await service.getStoreOptions(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getStores = async (req, res, next) => {
  try {
    await service.getStores(req, res);
  } catch (error) {
    next(error);
  }
};
exports.createStore = async (req, res, next) => {
  try {
    await service.createStore(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};
exports.updateStore = async (req, res, next) => {
  try {
    await service.updateStore(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};
exports.deleteStore = async (req, res, next) => {
  try {
    await service.deleteStore(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getStore = async (req, res, next) => {
  try {
    await service.getStore(req, res);
  } catch (error) {
    next(error);
  }
};

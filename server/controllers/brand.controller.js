const service = require('../services/brand.service');
exports.getBrandOptions = async (req, res, next) => {
  try {
    await service.getBrandOptions(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getBrands = async (req, res, next) => {
  try {
    await service.getBrands(req, res);
  } catch (error) {
    next(error);
  }
};
exports.createBrand = async (req, res, next) => {
  try {
    await service.createBrand(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};
exports.updateBrand = async (req, res, next) => {
  try {
    await service.updateBrand(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};
exports.deleteBrand = async (req, res, next) => {
  try {
    await service.deleteBrand(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getBrand = async (req, res, next) => {
  try {
    await service.getBrand(req, res);
  } catch (error) {
    next(error);
  }
};

exports.getBrandCountries = async (req, res, next) => {
  try {
    await service.getBrandCountries(req, res);
  } catch (error) {
    next(error);
  }
};

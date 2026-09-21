const service = require('../services/company.service');
exports.getCompanyOptions = async (req, res, next) => {
  try {
    await service.getCompanyOptions(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getCompanies = async (req, res, next) => {
  try {
    await service.getCompanies(req, res);
  } catch (error) {
    next(error);
  }
};
exports.createCompany = async (req, res, next) => {
  try {
    await service.createCompany(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};
exports.updateCompany = async (req, res, next) => {
  try {
    await service.updateCompany(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};
exports.deleteCompany = async (req, res, next) => {
  try {
    await service.deleteCompany(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getCompanyCountries = async (req, res, next) => {
  try {
    await service.getCompanyCountries(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getCompany = async (req, res, next) => {
  try {
    await service.getCompany(req, res);
  } catch (error) {
    next(error);
  }
};

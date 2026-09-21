const service = require("../services/edition.service");
exports.addEdition = async (req, res, next) => {
  try {
    await service.addEdition(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getEditions = async (req, res, next) => {
  try {
    await service.getEditions(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getEditionOptions = async (req, res, next) => {
  try {
    await service.getEditionOptions(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getEdition = async (req, res, next) => {
  try {
    await service.getEdition(req, res);
  } catch (error) {
    next(error);
  }
};
exports.updateEdition = async (req, res, next) => {
  try {
    await service.updateEdition(req, res);
  } catch (error) {
    next(error);
  }
};
exports.deleteEdition = async (req, res, next) => {
  try {
    await service.deleteEdition(req, res);
  } catch (error) {
    next(error);
  }
};
exports.createEdition = exports.addEdition;

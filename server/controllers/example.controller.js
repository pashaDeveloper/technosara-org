const service = require("../services/example.service");
exports.addExample = async (req, res, next) => {
  try {
    await service.addExample(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getExamples = async (req, res, next) => {
  try {
    await service.getExamples(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getExampleOptions = async (req, res, next) => {
  try {
    await service.getExampleOptions(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getExample = async (req, res, next) => {
  try {
    await service.getExample(req, res);
  } catch (error) {
    next(error);
  }
};
exports.updateExample = async (req, res, next) => {
  try {
    await service.updateExample(req, res);
  } catch (error) {
    next(error);
  }
};
exports.deleteExample = async (req, res, next) => {
  try {
    await service.deleteExample(req, res);
  } catch (error) {
    next(error);
  }
};
exports.createExample = exports.addExample;

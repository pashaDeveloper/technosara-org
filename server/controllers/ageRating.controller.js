const service = require("../services/ageRating.service");
exports.addAgeRating = async (req, res, next) => {
  try {
    await service.addAgeRating(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getAgeRatings = async (req, res, next) => {
  try {
    await service.getAgeRatings(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getAgeRatingOptions = async (req, res, next) => {
  try {
    await service.getAgeRatingOptions(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getAgeRating = async (req, res, next) => {
  try {
    await service.getAgeRating(req, res);
  } catch (error) {
    next(error);
  }
};
exports.updateAgeRating = async (req, res, next) => {
  try {
    await service.updateAgeRating(req, res);
  } catch (error) {
    next(error);
  }
};
exports.deleteAgeRating = async (req, res, next) => {
  try {
    await service.deleteAgeRating(req, res);
  } catch (error) {
    next(error);
  }
};
exports.createAgeRating = exports.addAgeRating;

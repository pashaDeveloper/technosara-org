const service = require("../services/achievementGroup.service");
exports.addAchievementGroup = async (req, res, next) => {
  try {
    await service.addAchievementGroup(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getAchievementGroups = async (req, res, next) => {
  try {
    await service.getAchievementGroups(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getAchievementGroupOptions = async (req, res, next) => {
  try {
    await service.getAchievementGroupOptions(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getAchievementGroup = async (req, res, next) => {
  try {
    await service.getAchievementGroup(req, res);
  } catch (error) {
    next(error);
  }
};
exports.updateAchievementGroup = async (req, res, next) => {
  try {
    await service.updateAchievementGroup(req, res);
  } catch (error) {
    next(error);
  }
};
exports.deleteAchievementGroup = async (req, res, next) => {
  try {
    await service.deleteAchievementGroup(req, res);
  } catch (error) {
    next(error);
  }
};
exports.createAchievementGroup = exports.addAchievementGroup;

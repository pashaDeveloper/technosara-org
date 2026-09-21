const service = require("../services/achievement.service");
exports.addAchievement = async (req, res, next) => {
  try {
    await service.addAchievement(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getAchievements = async (req, res, next) => {
  try {
    await service.getAchievements(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getAchievementOptions = async (req, res, next) => {
  try {
    await service.getAchievementOptions(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getAchievement = async (req, res, next) => {
  try {
    await service.getAchievement(req, res);
  } catch (error) {
    next(error);
  }
};
exports.updateAchievement = async (req, res, next) => {
  try {
    await service.updateAchievement(req, res);
  } catch (error) {
    next(error);
  }
};
exports.deleteAchievement = async (req, res, next) => {
  try {
    await service.deleteAchievement(req, res);
  } catch (error) {
    next(error);
  }
};
exports.createAchievement = exports.addAchievement;

const service = require("../services/game.service");
exports.addGame = async (req, res, next) => {
  try {
    await service.addGame(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getGames = async (req, res, next) => {
  try {
    await service.getGames(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getGameOptions = async (req, res, next) => {
  try {
    await service.getGameOptions(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getGame = async (req, res, next) => {
  try {
    await service.getGame(req, res);
  } catch (error) {
    next(error);
  }
};
exports.updateGame = async (req, res, next) => {
  try {
    await service.updateGame(req, res);
  } catch (error) {
    next(error);
  }
};
exports.deleteGame = async (req, res, next) => {
  try {
    await service.deleteGame(req, res);
  } catch (error) {
    next(error);
  }
};
exports.createGame = exports.addGame;

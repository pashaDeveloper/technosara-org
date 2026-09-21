const service = require("../services/user.service");
exports.addUser = async (req, res, next) => {
  try {
    await service.addUser(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getUsers = async (req, res, next) => {
  try {
    await service.getUsers(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getUserOptions = async (req, res, next) => {
  try {
    await service.getUserOptions(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getUser = async (req, res, next) => {
  try {
    await service.getUser(req, res);
  } catch (error) {
    next(error);
  }
};
exports.updateUser = async (req, res, next) => {
  try {
    await service.updateUser(req, res);
  } catch (error) {
    next(error);
  }
};
exports.deleteUser = async (req, res, next) => {
  try {
    await service.deleteUser(req, res);
  } catch (error) {
    next(error);
  }
};
exports.createUser = exports.addUser;

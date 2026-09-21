const service = require("../services/address.service");
exports.addAddress = async (req, res, next) => {
  try {
    await service.addAddress(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getAddresses = async (req, res, next) => {
  try {
    await service.getAddresses(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getAddressOptions = async (req, res, next) => {
  try {
    await service.getAddressOptions(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getAddress = async (req, res, next) => {
  try {
    await service.getAddress(req, res);
  } catch (error) {
    next(error);
  }
};
exports.updateAddress = async (req, res, next) => {
  try {
    await service.updateAddress(req, res);
  } catch (error) {
    next(error);
  }
};
exports.deleteAddress = async (req, res, next) => {
  try {
    await service.deleteAddress(req, res);
  } catch (error) {
    next(error);
  }
};
exports.createAddress = exports.addAddress;

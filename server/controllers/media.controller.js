const service = require("../services/media.service");
exports.addMedia = async (req, res, next) => {
  try {
    await service.addMedia(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getMediaList = async (req, res, next) => {
  try {
    await service.getMediaList(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getMediaOptions = async (req, res, next) => {
  try {
    await service.getMediaOptions(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getMedia = async (req, res, next) => {
  try {
    await service.getMedia(req, res);
  } catch (error) {
    next(error);
  }
};
exports.updateMedia = async (req, res, next) => {
  try {
    await service.updateMedia(req, res);
  } catch (error) {
    next(error);
  }
};
exports.deleteMedia = async (req, res, next) => {
  try {
    await service.deleteMedia(req, res);
  } catch (error) {
    next(error);
  }
};
exports.createMedia = exports.addMedia;

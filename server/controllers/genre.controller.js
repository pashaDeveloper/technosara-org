const service = require('../services/genre.service');
exports.reorderGenre = async (req, res, next) => {
  try { await service.reorderGenre(req, res); } catch (error) { next(error); }
};
exports.getGenreOptions = async (req, res, next) => {
  try {
    await service.getGenreOptions(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getGenres = async (req, res, next) => {
  try {
    await service.getGenres(req, res);
  } catch (error) {
    next(error);
  }
};
exports.createGenre = async (req, res, next) => {
  try {
    await service.createGenre(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};
exports.updateGenre = async (req, res, next) => {
  try {
    await service.updateGenre(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};
exports.deleteGenre = async (req, res, next) => {
  try {
    await service.deleteGenre(req, res);
  } catch (error) {
    next(error);
  }
};
exports.getGenre = async (req, res, next) => {
  try {
    await service.getGenre(req, res);
  } catch (error) {
    next(error);
  }
};

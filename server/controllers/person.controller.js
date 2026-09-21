const personService = require("../services/person.service");

exports.getPersonCountries = async (req, res, next) => {
  try {
    await personService.countries(req, res);
  } catch (error) {
    next(error);
  }
};

exports.getPersonOptions = async (req, res, next) => {
  try {
    await personService.options(req, res);
  } catch (error) {
    next(error);
  }
};

exports.getPeople = async (req, res, next) => {
  try {
    await personService.list(req, res);
  } catch (error) {
    next(error);
  }
};

exports.getPerson = async (req, res, next) => {
  try {
    await personService.get(req, res);
  } catch (error) {
    next(error);
  }
};

exports.createPerson = async (req, res, next) => {
  try {
    await personService.create(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};

exports.updatePerson = async (req, res, next) => {
  try {
    await personService.update(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};

exports.deletePerson = async (req, res, next) => {
  try {
    await personService.remove(req, res);
  } catch (error) {
    next(error);
  }
};

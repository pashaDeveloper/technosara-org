const service = require('../services/catalog.service');
module.exports = resource => async (req, res, next) => {
  try {
    const Model = service.resources[resource];
    const doc = req.params.id ? await Model.findById(req.params.id) : new Model();
    if (!doc) throw service.fail('Record not found', 404);
    if (req.method === 'DELETE') await service.assertDeletable(Model, doc._id);
    else { doc.set(service.writable(Model, req.body)); await service.validateReferences(doc); }
    next();
  } catch (error) { if (['ValidationError', 'CastError'].includes(error.name)) error.status = 400; next(error); }
};

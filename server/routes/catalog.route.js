const router = require('express').Router();
const verify = require('../middleware/verifyAdmin.middleware');
const authorize = require('../middleware/authorize.middleware');
const service = require('../services/catalog.service');
const mongoose = require('mongoose');
const wrap = fn => async (req, res, next) => {
  try { await fn(req, res); } catch (error) {
    if (error.code === 11000) error.status = 409;
    if (['ValidationError', 'CastError'].includes(error.name)) error.status = 400;
    next(error);
  }
};
router.use(verify, authorize('superAdmin', 'admin'));
router.get('/options/:model', wrap(async (req, res) => {
  const allowed = ['Game', 'Edition', 'GameContent', 'Platform', 'Store', 'Company', 'AchievementGroup', ...Object.values(require('../utils/gameRelations').catalogs).map(({ Model }) => Model.modelName)];
  const Model = mongoose.models[req.params.model];
  if (!Model || !allowed.includes(Model.modelName)) throw service.fail('Unknown reference');
  const filter = service.filters(Model, { search: req.query.search || '' });
  const data = await Model.find(filter).select('title name code store_title external_product_id external_id market currency external_sku_id').limit(100).lean();
  res.json({ data });
}));
router.get('/schema', (req, res) => res.json({ data: Object.fromEntries(Object.entries(service.resources).map(([key, Model]) => [key, {
  readOnly: service.readOnly.has(key), fields: Object.entries(Model.schema.paths).filter(([name]) => !['_id', '__v', 'creator', 'isDeleted', 'deletedAt', 'createdAt', 'updatedAt'].includes(name) && !name.startsWith('approvalReview')).map(([name, path]) => ({ name, type: path.instance, required: typeof path.options.required === 'function' ? false : Boolean(path.isRequired), options: path.enumValues, ref: path.options.ref || path.caster?.options?.ref, default: typeof path.defaultValue === 'function' ? undefined : path.defaultValue }))
}])) }));
router.get('/games/:id', wrap(async (req, res) => res.json({ data: await service.detail(req.params.id, { internal: true }) })));
router.param('resource', (req, res, next, key) => {
  req.Model = service.resources[key];
  if (!req.Model) return next(service.fail('Resource not found', 404));
  next();
});
router.param('id', (req, res, next, id) => next(mongoose.isObjectIdOrHexString(id) ? undefined : service.fail('Invalid ID')));
router.get('/:resource', wrap(async (req, res) => res.json(await service.list(req.Model, req.query))));
router.get('/:resource/all', wrap(async (req, res) => res.json(await service.list(req.Model, { ...req.query, limit: '100' }))));
router.get('/:resource/:id', wrap(async (req, res) => {
  const doc = await req.Model.findById(req.params.id); if (!doc) throw service.fail('Record not found', 404);
  res.json({ data: doc });
}));
router.use('/:resource', (req, res, next) => {
  if (service.readOnly.has(req.params.resource)) return next(service.fail('Use sync workflow for this resource', 405));
  if (req.params.resource === 'store-prices' && req.method !== 'POST') return next(service.fail('Price history is append-only', 405));
  next();
});
router.post('/:resource', wrap(async (req, res) => res.status(201).json({ acknowledgement: true, data: await service.save(req.Model, req.body, req.admin._id) })));
router.patch('/:resource/:id', wrap(async (req, res) => res.json({ acknowledgement: true, data: await service.save(req.Model, req.body, req.admin._id, req.params.id) })));
router.delete('/:resource/:id', wrap(async (req, res) => {
  const doc = await req.Model.findById(req.params.id); if (!doc) throw service.fail('Record not found', 404);
  await service.assertDeletable(req.Model, doc._id);
  await doc.softDelete(); res.json({ acknowledgement: true });
}));
module.exports = router;

const router = require('express').Router();
const settings = require('../services/uploadSettings.service');
const multer = require('multer');
const wrap = handler => async (req, res, next) => { try { await handler(req, res); } catch (error) { next(error); } };
router.use(require('../middleware/verifyAdmin.middleware'), require('../middleware/authorize.middleware')('superAdmin', 'admin'));
router.get('/', wrap(async (req, res) => res.json({ data: await settings.read(), ranges: settings.ranges })));
router.patch('/', wrap(async (req, res) => res.json({ acknowledgement: true, data: await settings.save(req.body) })));
router.post('/preview', multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1, fieldSize: 2048 } }).single('image'), wrap(async (req, res) => {
  if (!req.file) throw Object.assign(new Error('Select an image'), { status: 400 });
  let values;
  try { values = JSON.parse(req.body.settings); } catch { throw Object.assign(new Error('Invalid settings'), { status: 400 }); }
  const options = settings.validate(values);
  const { full, preview } = await require('../utils/compressImage')(req.file.buffer, options);
  res.json({ data: { image: `data:image/webp;base64,${full.toString('base64')}`, preview: `data:image/webp;base64,${preview.toString('base64')}`, originalBytes: req.file.size, imageBytes: full.length, previewBytes: preview.length } });
}));
module.exports = router;

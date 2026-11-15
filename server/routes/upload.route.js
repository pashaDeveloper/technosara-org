const router = require('express').Router();
const allowed = new Set(['avatar', 'banner', 'gallery', 'news', 'category', 'tag', 'magazine', 'product', 'story', 'blog', 'thumbnail', 'image', 'logo']);
router.use(require('../middleware/verifyAdmin.middleware'), require('../middleware/authorize.middleware')('superAdmin', 'admin'));
router.post('/:folder', (req, res, next) => {
  if (!allowed.has(req.params.folder)) return res.status(400).json({ acknowledgement: false, description: 'پوشه آپلود معتبر نیست.' });
  const fields = ['avatar', 'thumbnail', 'image', 'logo', 'gallery', 'images', 'cover', 'banner', 'poster'].map(name => ({ name, maxCount: name === 'gallery' || name === 'images' ? 10 : 1 }));
  require('../middleware/upload.middleware')(req.params.folder, 'cloudinary').fields(fields)(req, res, next);
}, (req, res) => {
  req.commitUploads();
  res.json({ acknowledgement: true, data: req.uploadedFiles });
});
module.exports = router;

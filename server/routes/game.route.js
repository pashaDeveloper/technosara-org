const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const gameController = require("../controllers/game.controller");

const router = express.Router();
router.get('/lookup', verify, authorize('superAdmin', 'admin'), async (req, res, next) => {
  try { res.json({ data: await require('../services/gameDraft.service').suggestions(req.query) }); } catch (error) { next(error); }
});
router.post('/lookup/:providerId', verify, authorize('superAdmin', 'admin'), async (req, res, next) => {
  try {
    const result = await require('../services/gameDraft.service').select(req.params.providerId, req.admin._id);
    if (result.local?.record) result.local.record = await require('../services/gameDraftCompletion.service').complete(result.local.record);
    if (result.local?.record) result.local.record.saved_resources = await require('../services/savedGameResources.service').read(result.local.record._id);
    res.json(result);
  } catch (error) { next(error); }
});
router.post('/media/import', verify, authorize('superAdmin', 'admin'), async (req, res, next) => {
  try {
    const field = req.body.fieldName;
    if (!['thumbnail', 'detail_banner', 'detail_poster', 'detail_gif', 'screenshot', 'cover', 'logo'].includes(field)) return res.status(400).json({ description: 'نوع تصویر معتبر نیست.' });
    if (!String(req.body.gameTitle || '').trim()) return res.status(400).json({ description: 'ابتدا نام بازی را وارد کنید.' });
    req.files = { [field]: [await require('../services/remoteImage.service').download(req.body.url)] };
    require('../middleware/upload.middleware')('games', 'cloudinary').fields([{ name: field, maxCount: 1 }])(req, res, next);
  } catch (error) { next(error); }
}, (req, res) => { req.commitUploads(); res.json({ acknowledgement: true, data: req.uploadedFiles }); });
router.post('/storage/source', verify, authorize('superAdmin', 'admin'), async (req, res, next) => {
  try { res.json({ data: await require('../services/gameStorage.service').read(req.body) }); }
  catch (error) { next(error); }
});
router.post('/media/upload', verify, authorize('superAdmin', 'admin'), require('../middleware/upload.middleware')('games', 'cloudinary').fields(['thumbnail', 'detail_banner', 'detail_gif', 'detail_poster', 'screenshot', 'cover', 'logo', 'video', 'trailer', 'gameplay', 'micro_trailer'].map(name => ({ name, maxCount: 1 }))), (req, res) => {
  req.commitUploads?.();
  res.json({ acknowledgement: true, data: req.uploadedFiles });
});
router.post('/media/source', verify, authorize('superAdmin', 'admin'), async (req, res, next) => {
  try { res.json({ data: await require('../services/gameMedia.service').read(req.body) }); }
  catch (error) { next(error); }
});
router.post('/media/boxart', verify, authorize('superAdmin', 'admin'), async (req, res, next) => {
  try { res.json({ data: await require('../services/boxArt.service').read(req.body) }); }
  catch (error) { next(error); }
});
router.get('/capabilities', verify, authorize('superAdmin', 'admin'), (req, res) => res.json({ data: require('../utils/gameCapabilities').definitions }));
router.post('/capabilities/source', verify, authorize('superAdmin', 'admin'), async (req, res, next) => {
  try { res.json({ data: await require('../services/storeCapabilities.service').read(req.body) }); }
  catch (error) { next(error); }
});
const identity = async (req, res, next) => { try { await require('../utils/gameIdentity').validateGameIdentity(req.body, req.params.id); next(); } catch (error) { error.status ||= 400; next(error); } };

const trophyService = body => {
  if (body.provider === 'psn') return require('../services/psnTrophies.service');
  if (body.provider && !['platprices', 'openxbl'].includes(body.provider)) throw Object.assign(new Error('سرویس انتخاب‌شده معتبر نیست.'), { status: 400 });
  return require(body.provider === 'openxbl' ? '../services/openxblTrophies.service' : '../services/platpricesTrophies.service');
};
router.get('/trophies/status', verify, authorize('superAdmin', 'admin'), (req, res) => res.json({ data: { configured: Boolean(process.env.PSN_NPSSO?.trim() || process.env.PLATPRICES_API_KEY?.trim() || process.env.OPENXBL_API_KEY?.trim()), providers: { psn: Boolean(process.env.PSN_NPSSO?.trim()), platprices: Boolean(process.env.PLATPRICES_API_KEY?.trim()), openxbl: Boolean(process.env.OPENXBL_API_KEY?.trim()) } } }));
for (const action of ['candidates', 'preview']) router.post(`/trophies/${action}`, verify, authorize('superAdmin', 'admin'), async (req, res, next) => {
  try { res.json({ data: await trophyService(req.body)[action](req.body) }); } catch (error) { next(error); }
});
router.post('/:id/trophies/import', verify, authorize('superAdmin', 'admin'), async (req, res, next) => {
  try { res.json({ data: await trophyService(req.body).importTrophies(req.params.id, req.body, req.admin._id) }); }
  catch (error) { if (error.code === 11000) error.status = 409; next(error); }
});

router.post('/dlc/discover', verify, authorize('superAdmin', 'admin'), async (req, res, next) => {
  try { res.json({ data: await require('../services/consoleDlc.service').discoverDraft(req.body) }); }
  catch (error) { next(error); }
});
router.post('/dlc/preview', verify, authorize('superAdmin', 'admin'), async (req, res, next) => {
  try {
    const service = req.body.provider === 'steam' ? require('../services/steamDlc.service') : require('../services/consoleDlc.service');
    const { raw, ...data } = await service.previewOne(req.body);
    data.content = await require('../services/dlcLocalization.service').localizeDlc(data.content);
    res.json({ data });
  }
  catch (error) { next(error); }
});

router.post('/:id/dlc/discover', verify, authorize('superAdmin', 'admin'), async (req, res, next) => {
  try { res.json({ data: await require('../services/steamDlc.service').discover(req.params.id) }); }
  catch (error) { next(error); }
});
router.post('/:id/dlc/import', verify, authorize('superAdmin', 'admin'), async (req, res, next) => {
  try {
    const service = ['xbox', 'playstation'].includes(req.body.provider) ? require('../services/consoleDlc.service') : require('../services/steamDlc.service');
    res.json({ data: await service.importOne(req.params.id, req.body, req.admin._id) });
  }
  catch (error) { if (error.code === 11000) error.status = 409; next(error); }
});

router.post('/store-descriptions', verify, authorize('superAdmin', 'admin'), async (req, res, next) => {
  try {
    const service = require('../services/storeDescriptions.service');
    res.json({ data: await service.resolveDescription(req.body) });
  }
  catch (error) { next(error); }
});

router.get(
  "/all",
  gameController.getGameOptions,
);
router.get(
  "/",
  gameController.getGames,
);
router.get("/:id/catalog", async (req, res, next) => { try { res.json({ data: await require("../services/catalog.service").detail(req.params.id) }); } catch (error) { next(error); } });
router.get(
  "/:id",
  gameController.getGame,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  identity,
  gameController.addGame,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  identity,
  gameController.updateGame,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  gameController.deleteGame,
);

module.exports = router;

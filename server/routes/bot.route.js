const express = require('express');
const { timingSafeEqual } = require('node:crypto');
const mongoose = require('mongoose');
const Game = require('../models/game.model');
require('../models/media.model');
const router = express.Router();

const matches = (value, expected) => {
  if (!value || !expected || expected.length < 32) return false;
  const a = Buffer.from(value), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};
router.use((req, res, next) => {
  const token = /^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1];
  req.botManager = matches(token, process.env.GAME_BOT_ADMIN_KEY);
  if (!req.botManager && !matches(token, process.env.GAME_BOT_CUSTOMER_KEY)) {
    return res.status(401).json({ message: 'Invalid bot credentials' });
  }
  next();
});
router.get('/connection', (req, res) => res.json({ data: {
  service: 'technosara-games', version: 1,
  role: req.botManager ? 'manager' : 'customer',
  databaseReady: mongoose.connection.readyState === 1,
} }));
router.get('/games', async (req, res, next) => {
  try {
    const page = Math.max(1, Math.min(100000, parseInt(req.query.page) || 1));
    const limit = 10;
    const filter = req.botManager ? {} : { publication_status: 'published' };
    const [items, total] = await Promise.all([
      Game.find(filter).select('title slug short_description publication_status cover_media_id')
        .populate({ path: 'cover_media_id', select: 'url' }).sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      Game.countDocuments(filter),
    ]);
    res.json({ data: items, total, page, limit });
  } catch (error) { next(error); }
});
router.get('/games/:id', async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: 'Invalid game ID' });
    const data = await require('../services/catalog.service').detail(req.params.id, { internal: req.botManager });
    res.json({ data });
  } catch (error) { next(error); }
});
// Forms will be added to the bot separately. Writes use the panel's own validation.
router.post('/games', async (req, res, next) => {
  try {
    if (!req.botManager) return res.status(403).json({ message: 'Manager access required' });
    const id = process.env.GAME_BOT_ADMIN_ID;
    if (!mongoose.isObjectIdOrHexString(id)) return res.status(503).json({ message: 'Configure GAME_BOT_ADMIN_ID in panel server' });
    const admin = await require('../models/admin.model').findOne({ _id: id, status: 'active' });
    if (!admin) return res.status(403).json({ message: 'Bot panel administrator is inactive or missing' });
    req.admin = { _id: admin._id, role: admin.role };
    // Bot-created games remain drafts until reviewed in the panel.
    req.body.publication_status = 'draft';
    return require('../controllers/game.controller').addGame(req, res, next);
  } catch (error) { next(error); }
});
module.exports = router;

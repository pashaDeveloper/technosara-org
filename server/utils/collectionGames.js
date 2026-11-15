const mongoose = require('mongoose');
const Game = require('../models/game.model');
exports.collectionGames = async value => {
  if (value === undefined) return undefined;
  const invalid = message => Object.assign(new Error(message), { status: 400 });
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { throw invalid('فهرست بازی‌ها معتبر نیست'); }
  }
  if (!Array.isArray(value) || value.some(id => typeof id !== 'string' || !mongoose.isObjectIdOrHexString(id))) throw invalid('شناسه بازی معتبر نیست');
  const ids = [...new Set(value.map(id => id.toLowerCase()))];
  if (await Game.countDocuments({ _id: { $in: ids } }) !== ids.length) throw invalid('بعضی بازی‌های انتخاب‌شده وجود ندارند');
  return ids;
};

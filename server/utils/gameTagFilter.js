const mongoose = require('mongoose');
const GameTag = require('../models/tag.model');
exports.gameTagFilter = async ({ game_tag_id, related_to }) => {
  for (const id of [game_tag_id, related_to]) {
    if (id !== undefined && (typeof id !== 'string' || !mongoose.isObjectIdOrHexString(id))) {
      throw Object.assign(new Error('شناسه تگ یا بازی معتبر نیست'), { status: 400 });
    }
  }
  const query = { is_active: true };
  if (game_tag_id) query._id = game_tag_id;
  if (related_to) query.game_ids = related_to;
  const tags = await GameTag.find(query).select('game_ids').lean();
  return { $in: [...new Set(tags.flatMap(tag => tag.game_ids.map(String)))].filter(id => id !== related_to?.toLowerCase()) };
};

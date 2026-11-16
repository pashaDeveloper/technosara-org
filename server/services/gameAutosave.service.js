const Game = require('../models/game.model');
const fields = new Set(['status', 'release_date', 'official_website', 'developer_ids', 'publisher_ids', 'platform_ids', 'genre_ids', 'theme_ids', 'tags', 'game_mode_ids', 'game_series_ids', 'feature_ids', 'alternate_titles', 'short_description', 'description', 'storage_sizes', 'platform_capabilities', 'capability_status', 'has_persian_subtitles', 'image', 'detail_banner', 'detail_poster', 'detail_gif', 'screenshots', 'platform_covers', 'cover_media_id', 'official_stores', 'offers']);
async function save(id, input) {
  const existing = await Game.findById(id);
  if (!existing) throw Object.assign(new Error('Game not found'), { status: 404 });
  const body = Object.fromEntries(Object.entries(input).filter(([key]) => fields.has(key)));
  const updates = {
    ...await require('../utils/gameClassifications').gameClassificationValues(body),
    ...require('../utils/gamebrainValues').gamebrainValues(body),
    ...require('../utils/gameTitles').alternateTitleValues(body),
    ...await require('../utils/gameCapabilities').capabilityValues({ ...body, ...(body.platform_capabilities !== undefined && body.platform_ids === undefined ? { platform_ids: existing.platform_ids } : {}) }, existing),
  };
  for (const field of ['status', 'release_date', 'official_website', 'developer_ids', 'publisher_ids', 'short_description', 'description', 'has_persian_subtitles', 'cover_media_id']) {
    if (Object.hasOwn(body, field)) updates[field] = body[field];
  }
  for (const field of ['developer_ids', 'publisher_ids']) if (updates[field] !== undefined) {
    const ids = updates[field];
    if (!Array.isArray(ids) || ids.some(value => !require('mongoose').isObjectIdOrHexString(value))) throw Object.assign(new Error('Invalid company IDs'), { status: 400 });
    if (ids.length && await require('../models/company.model').countDocuments({ _id: { $in: ids } }) !== new Set(ids).size) throw Object.assign(new Error('Company not found'), { status: 400 });
  }
  const candidate = new Game({ ...existing.toObject(), ...updates });
  const error = candidate.validateSync(Object.keys(updates));
  if (error) throw Object.assign(error, { status: 400 });
  // Saving form progress must not finalize or publish an automatic draft.
  await Game.updateOne({ _id: id }, { $set: updates }, { runValidators: true });
  return { saved: true };
}
module.exports = { save, fields };

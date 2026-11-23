const fields = [...new Set(['storage_sizes', 'pc_requirements', 'platform_covers', 'detail_banner_mirrored', 'console_api_stores', 'playstation_product_id', 'xbox_product_id', 'id', 'link', 'genre', 'x_url', 'adult_only', 'image_aspect_ratio', 'rating', 'playtime', 'similar_ids', 'name_fa', ...['id','name','image','image_aspect_ratio','link','x_url','rating','description','short_description','release_date','developer','playtime','platforms','tags','genres','genre','themes','adult_only','play_modes','screenshots','videos','offers','twitch_videos','official_stores','micro_trailer','gameplay','trailer','gameplay_videos','trailers','video_source_keys']])];
const Game = require('../models/game.model');
const { normalizePcRequirements } = require('./pcRequirements');
// Validate the same typed fields for JSON and multipart requests. Omitted fields
// are not returned, so an unrelated edit cannot erase imported metadata.
function gamebrainValues(body) {
  const values = {};
  for (const field of ['detail_banner', 'detail_gif', 'detail_poster']) if (body[field] !== undefined) values[field] = body[field] || null;
  for (const field of fields) {
    if (body[field] === undefined) continue;
    let value = body[field];
    if (['storage_sizes', 'pc_requirements', 'platform_covers', 'rating', 'playtime', 'similar_ids', 'platforms', 'genres', 'themes', 'play_modes', 'screenshots', 'videos', 'gameplay_videos', 'trailers', 'video_source_keys', 'offers', 'twitch_videos','official_stores','console_api_stores'].includes(field) && typeof value === 'string') {
      try { value = JSON.parse(value); } catch { throw Object.assign(new Error(`Invalid ${field}`), { status: 400 }); }
    }
    if (field === 'console_api_stores' && value != null) {
      const { productUrl } = require('../services/storeDescriptions.service');
      if (!Array.isArray(value) || value.length > 2 || new Set(value.map(row => row?.provider)).size !== value.length) {
        throw Object.assign(new Error('Invalid console resource sources'), { status: 400 });
      }
      value = value.map(row => {
        if (!['sony', 'xbox'].includes(row?.provider)) throw Object.assign(new Error('Invalid console provider'), { status: 400 });
        return { provider: row.provider, url: productUrl(row.provider, row.url).source,
          title: typeof row.title === 'string' ? row.title.trim().slice(0, 200) : undefined };
      });
    }
    values[field] = field === 'pc_requirements' ? normalizePcRequirements(value) : value;
  }
  if (['gameplay', 'gameplay_videos', 'trailer', 'trailers'].every(key => Object.hasOwn(values, key)) &&
      Array.isArray(values.gameplay_videos) && Array.isArray(values.trailers)) {
    const videoKey = require('./gameVideoKey');
    const origins = new Map((Array.isArray(values.video_source_keys) ? values.video_source_keys : [])
      .filter(row => row?.url && row?.key).map(row => [row.url, row.key]));
    const seen = new Set();
    const unique = urls => urls.filter(url => {
      if (!url) return false;
      const key = origins.get(url) || videoKey(url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    values.gameplay_videos = unique([values.gameplay, ...values.gameplay_videos]);
    values.trailers = unique([values.trailer, ...values.trailers]);
    if (Array.isArray(values.video_source_keys)) {
      const retained = new Set([...values.gameplay_videos, ...values.trailers]);
      values.video_source_keys = values.video_source_keys.filter(row => retained.has(row?.url));
    }
    values.gameplay = values.gameplay_videos[0] || null;
    values.trailer = values.trailers[0] || null;
  }
  if (body.name !== undefined) values.title = body.name;
  else if (body.title !== undefined) values.name = body.title;
  const doc = new Game(values);
  const error = doc.validateSync([...fields, 'detail_banner', 'detail_gif', 'detail_poster']);
  if (error) throw Object.assign(error, { status: 400 });
  return Object.fromEntries(Object.keys(values).map(field => [field, doc.get(field)]));
}
module.exports = { gamebrainValues };

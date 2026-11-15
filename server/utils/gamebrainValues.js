const fields = [...new Set(['storage_sizes', 'platform_covers', 'id', 'link', 'genre', 'x_url', 'adult_only', 'image_aspect_ratio', 'rating', 'playtime', 'similar_ids', 'name_fa', ...['id','name','image','image_aspect_ratio','link','x_url','rating','description','short_description','release_date','developer','playtime','platforms','tags','genres','genre','themes','adult_only','play_modes','screenshots','videos','offers','twitch_videos','official_stores','micro_trailer']])];
const Game = require('../models/game.model');
// Validate the same typed fields for JSON and multipart requests. Omitted fields
// are not returned, so an unrelated edit cannot erase imported metadata.
function gamebrainValues(body) {
  const values = {};
  for (const field of ['detail_banner', 'detail_gif', 'detail_poster']) if (body[field] !== undefined) values[field] = body[field] || null;
  for (const field of fields) {
    if (body[field] === undefined) continue;
    let value = body[field];
    if (['storage_sizes', 'platform_covers', 'rating', 'playtime', 'similar_ids', 'platforms', 'genres', 'themes', 'play_modes', 'screenshots', 'videos', 'offers', 'twitch_videos','official_stores'].includes(field) && typeof value === 'string') {
      try { value = JSON.parse(value); } catch { throw Object.assign(new Error(`Invalid ${field}`), { status: 400 }); }
    }
    values[field] = value;
  }
  if (body.name !== undefined) values.title = body.name;
  else if (body.title !== undefined) values.name = body.title;
  const doc = new Game(values);
  const error = doc.validateSync([...fields, 'detail_banner', 'detail_gif', 'detail_poster']);
  if (error) throw Object.assign(error, { status: 400 });
  return Object.fromEntries(Object.keys(values).map(field => [field, doc.get(field)]));
}
module.exports = { gamebrainValues };

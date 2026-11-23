const Game = require('../models/game.model');
const { normalizePcRequirements } = require('../utils/pcRequirements');
const fail = (message, status) => Object.assign(new Error(message), { status });
async function missingCloudImage(value, fetcher = fetch) {
  let url;
  try { url = new URL(value); } catch { return false; }
  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || url.username || url.password || url.port) return false;
  try {
    const response = await fetcher(url.href, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(8000), headers: { 'Cache-Control': 'no-cache' } });
    return response.status === 404 || response.status === 410;
  } catch { return false; } // A temporary outage is not evidence of deletion.
}
const image = value => typeof value === 'string' ? value : value?.url || value?.image || '';
function videoUrl(value) {
  if (typeof value !== 'string') return '';
  try { return ['https:', 'http:'].includes(new URL(value).protocol) ? value.trim() : ''; }
  catch { return ''; }
}
const videos = value => Array.isArray(value) ? [...new Set(value.map(videoUrl).filter(Boolean))] : [];
async function recover(id, fetcher = fetch) {
  let record = await Game.findById(id).lean();
  if (!record) throw fail('Game not found', 404);
  const previousRequirements = record.pc_requirements;
  const requirements = normalizePcRequirements(previousRequirements);
  if (requirements !== previousRequirements) {
    await Game.collection.updateOne(
      { _id: record._id, pc_requirements: previousRequirements },
      { $set: { pc_requirements: requirements } },
    );
    record = await Game.findById(id).lean();
    if (!record) throw fail('Game not found', 404);
  }
  const warnings = [];
  let source = record.gamebrain_source;
  const hasMainVideo = value => videos(value?.videos).length > 0 || Boolean(videoUrl(value?.micro_trailer));
  if (record.id && (!source || ['release_date', 'developer', 'image'].some(field => !record[field] && !source[field]) || (!record.screenshots?.length && !source.screenshots?.length) || (!hasMainVideo(record) && !hasMainVideo(source)))) {
    try { source = await require('./gamebrain.service').details(String(record.id)); }
    catch { warnings.push('source_unavailable'); }
  }
  const updates = {};
  if (source && source !== record.gamebrain_source) updates.gamebrain_source = source;
  source ||= {};
  const sourceVideos = videos(source.videos);
  let storeDetails;
  const steam = require('./steamDlc.service');
  const steamIds = [...new Set([...(record.official_stores || []), ...(record.offers || []), ...(source.official_stores || [])].map(row => steam.steamId(row.url)).filter(Boolean))];
  if (steamIds.length === 1 && (!record.publisher_ids?.length || !record.detail_banner || !record.detail_poster || (!hasMainVideo(record) && !hasMainVideo(source)))) {
    try {
      const details = await steam.details(steamIds[0], fetcher);
      require('./storeDescriptions.service').selectTitle([{ title: details.name, url: `https://store.steampowered.com/app/${steamIds[0]}/` }], record.title);
      storeDetails = details;
    } catch { warnings.push('store_metadata_unavailable'); }
  }
  if (!videos(record.videos).length) {
    const storeVideos = !hasMainVideo(record) && !hasMainVideo(source)
      ? videos((storeDetails?.movies || []).map(row => row.mp4?.max || row.mp4?.['480'] || row.webm?.max))
      : [];
    if (sourceVideos.length || storeVideos.length) updates.videos = sourceVideos.length ? sourceVideos : storeVideos;
  }
  const trailer = videoUrl(source.micro_trailer);
  if (!videoUrl(record.micro_trailer) && trailer) updates.micro_trailer = trailer;
  const twitchVideos = Array.isArray(source.twitch_videos) ? source.twitch_videos.filter(row => videoUrl(row?.url)) : [];
  if (!record.twitch_videos?.some(row => videoUrl(row?.url)) && twitchVideos.length) updates.twitch_videos = twitchVideos;
  for (const field of ['release_date', 'official_website', 'developer', 'official_stores', 'offers', 'platforms', 'genres', 'play_modes']) {
    if ((!record[field] || (Array.isArray(record[field]) && !record[field].length)) && source[field]) updates[field] = source[field];
  }
  const checks = new Map();
  const missing = url => { if (!checks.has(url)) checks.set(url, missingCloudImage(url, fetcher)); return checks.get(url); };
  let legacyImage;
  if (record.cover_media_id && !record.image) {
    const media = await require('../models/media.model').findById(record.cover_media_id).lean();
    if (media?.url && !await missing(media.url)) legacyImage = media.url;
    else updates.cover_media_id = null;
  }
  const urls = [...new Set([record.image, record.detail_banner, record.detail_poster, record.detail_gif, ...(record.screenshots || []), ...(record.platform_covers || []).flatMap(row => [row.low_quality, row.high_quality])].filter(Boolean))];
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, urls.length) }, async () => {
    while (cursor < urls.length) await missing(urls[cursor++]);
  }));
  for (const field of ['image', 'detail_banner', 'detail_poster', 'detail_gif']) {
    const value = record[field];
    if (!value || await missing(value)) {
      const replacement = (field === 'image' ? legacyImage : '') || image(source[field]) || (field === 'detail_banner' ? image(storeDetails?.background_raw || storeDetails?.background) : '');
      // Clear a confirmed dead link so the store picker can retrieve a replacement.
      if (replacement || value) updates[field] = replacement || null;
    }
  }
  if ((!record.detail_poster || await missing(record.detail_poster)) && !updates.detail_poster && storeDetails) {
    const poster = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steamIds[0]}/library_600x900.jpg`;
    try {
      const response = await fetcher(poster, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(8000) });
      if (response.ok && response.headers.get('content-type')?.startsWith('image/')) updates.detail_poster = poster;
    } catch { warnings.push('poster_unavailable'); }
  }
  const originals = (source.screenshots || []).map(image).filter(Boolean);
  const filterScreenshots = require('../utils/gameScreenshots').filterScreenshots;
  if (!record.screenshots?.length && originals.length) {
    const shots = await filterScreenshots(originals);
    if (shots.length) updates.screenshots = shots;
  }
  else if (record.screenshots?.length) {
    const next = [];
    for (const [index, value] of record.screenshots.entries()) {
      if (await missing(value)) {
        if (originals[index]) next.push(originals[index]);
        else warnings.push('screenshot_source_missing');
      } else next.push(value);
    }
    if (JSON.stringify(next) !== JSON.stringify(record.screenshots)) {
      updates.screenshots = await filterScreenshots(next, record.screenshots);
    }
  }
  if (record.platform_covers?.length) {
    const covers = [];
    for (const cover of record.platform_covers) {
      const next = { ...cover };
      for (const quality of ['low_quality', 'high_quality']) if (await missing(cover[quality])) next[quality] = null;
      if (!next.low_quality || !next.high_quality) {
        try {
          const result = await require('./boxArt.service').read({ title: record.title, platform_id: String(cover.platform_id) });
          if (!result.candidates) for (const quality of ['low_quality', 'high_quality']) next[quality] ||= result[quality];
        } catch { warnings.push('platform_cover_unavailable'); }
      }
      covers.push(next);
    }
    if (JSON.stringify(covers) !== JSON.stringify(record.platform_covers)) updates.platform_covers = covers;
  }
  // Use exact studio/publisher names from the saved provider response.
  for (const [field, names, role] of [
    ['developer_ids', storeDetails?.developers?.length ? storeDetails.developers : record.developer || source.developer, 'developer'],
    ['publisher_ids', storeDetails?.publishers || source.publishers || source.publisher, 'publisher'],
  ]) {
    if (record[field]?.length || !names) continue;
    const Company = require('../models/company.model');
    const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    const namesList = (Array.isArray(names) ? names : String(names).split(/,\s*(?:and\s+)?|\s+and\s+/i)).map(value => typeof value === 'string' ? value.trim() : value?.name).filter(Boolean);
    const companies = await Company.find().lean(), ids = [];
    for (const name of namesList.slice(0, 20)) {
      const matches = companies.filter(row => [row.name, row.name_en].some(value => normalize(value) === normalize(name)));
      if (matches.length === 1) ids.push(matches[0]._id);
      else if (!matches.length && name.length <= 200) {
        const slug = 'studio-' + require('crypto').createHash('sha256').update(normalize(name)).digest('hex').slice(0, 20);
        const company = await Company.findOneAndUpdate({ slug }, { $setOnInsert: { name, slug, type: role, creator: record.creator } }, { upsert: true, new: true, runValidators: true });
        ids.push(company._id);
      } else warnings.push(field + '_ambiguous');
    }
    if (ids.length) updates[field] = [...new Map(ids.map(value => [String(value), value])).values()];
  }
  if (Object.keys(updates).length) {
    // Compare every changed field to avoid overwriting edits made during network checks.
    for (const [field, value] of Object.entries(updates)) {
      const candidate = new Game({ [field]: value });
      if (candidate.validateSync([field])) { warnings.push(field + '_invalid'); continue; }
      const previous = record[field];
      await Game.updateOne({ _id: id, [field]: previous === undefined ? { $exists: false } : previous }, { $set: { [field]: value } }, { runValidators: true });
    }
    record = await Game.findById(id).lean();
  }
  return { record, warnings };
}
module.exports = { recover, missingCloudImage };

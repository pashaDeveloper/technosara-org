const steam = require('./steamDlc.service');
const gamebrain = require('./gamebrain.service');
const { read: readStoreMedia } = require('./gameMedia.service');
const { productUrl, selectTitle } = require('./storeDescriptions.service');

const videoKey = require('../utils/gameVideoKey');
const { steamStreamUrl } = require('./steamVideoDownload.service');

function candidate(value, title, provider, kind, cover) {
  const input = typeof value === 'string' ? value : value?.url;
  let url;
  try { url = new URL(input); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  const key = videoKey(url);
  let thumbnail;
  const image = cover || value?.thumbnail_url || value?.thumbnail;
  try {
    const source = new URL(typeof image === 'string' ? image : image?.url);
    if (source.protocol === 'https:' && !source.username && !source.password && !source.port) thumbnail = source.href;
  } catch {}
  if (!thumbnail && key.startsWith('youtube:')) thumbnail = `https://i.ytimg.com/vi/${key.slice(8)}/hqdefault.jpg`;
  return { url: url.href, key, title, provider, kind, thumbnail, steamStream: Boolean(steamStreamUrl(url)),
    direct: /\.(mp4|m4v|webm|ogg|ogv|mov)$/i.test(url.pathname) };
}

async function read({ kind, title, gamebrain_id, store_urls = [], exclude_urls = [] }) {
  if (!['gameplay', 'trailer'].includes(kind) || typeof title !== 'string' || !title.trim() || title.length > 200 ||
      !Array.isArray(store_urls) || store_urls.length > 100 || !Array.isArray(exclude_urls) || exclude_urls.length > 250) {
    throw Object.assign(new Error('Invalid video lookup'), { status: 400 });
  }

  const source = async () => {
    if (!/^\d{1,15}$/.test(String(gamebrain_id))) return [];
    const data = await gamebrain.details(String(gamebrain_id));
    const rows = Array.isArray(data.videos) ? data.videos : [];
    return [
      candidate(data.gameplay, null, 'GameBrain', 'gameplay'),
      candidate(data.trailer, null, 'GameBrain', 'trailer'),
      ...rows.flatMap(row => {
        const label = [row?.type, row?.title, row?.name].filter(Boolean).join(' ');
        const type = /\bgameplay\b/i.test(label) ? 'gameplay' : /\btrailer\b/i.test(label) ? 'trailer' : null;
        return type ? [candidate(row, row.title || row.name, 'GameBrain', type)] : [];
      }),
      candidate(data.micro_trailer, 'Micro trailer', 'GameBrain', 'trailer'),
    ].filter(Boolean);
  };

  const storefront = async () => {
    const ids = [...new Set(store_urls.map(steam.steamId).filter(Boolean))];
    if (!ids.length) {
      const result = await steam.read(`storesearch/?term=${encodeURIComponent(title.trim())}`);
      const options = (result.items || []).map(row => ({ title: row.name, url: `https://store.steampowered.com/app/${row.id}/` }));
      ids.push(steam.steamId(selectTitle(options, title).url));
    }
    if (ids.length !== 1 || !ids[0]) return [];
    const product = await steam.details(ids[0]);
    if (product.type !== 'game') return [];
    return (product.movies || []).map(row => candidate(
      row.mp4?.max || row.mp4?.['480'] || row.webm?.max || row.webm?.['480'] || row.hls_h264 || row.dash_h264,
      row.name, 'Steam', /\bgameplay\b/i.test(row.name) ? 'gameplay' : 'trailer', row.thumbnail,
    )).filter(Boolean);
  };

  const stores = ['xbox', 'sony'].flatMap(provider => {
    const url = store_urls.find(value => {
      try { productUrl(provider, value); return true; } catch { return false; }
    });
    return url ? [{ provider, url }] : [];
  });
  const consoleVideos = stores.map(async ({ provider, url }) => {
    const { videos } = await readStoreMedia({ provider, url, media: 'video' });
    return videos.flatMap(row => {
      const label = [row.role, row.title].filter(Boolean).join(' ');
      const category = /game[ _-]?play/i.test(label) ? 'gameplay' : /trailer/i.test(label) ? 'trailer' : null;
      return category ? [candidate(row.url, row.title, provider === 'sony' ? 'PlayStation' : 'Xbox', category, row.thumbnail)].filter(Boolean) : [];
    });
  });
  const results = await Promise.allSettled([...consoleVideos, source(), storefront()]);
  const videos = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  const unique = new Map();
  for (const video of videos) {
    const previous = unique.get(video.key);
    if (!previous || (video.kind === 'gameplay' && previous.kind !== 'gameplay') ||
        (video.kind === previous.kind && video.direct && !previous.direct)) {
      unique.set(video.key, { ...video, thumbnail: video.thumbnail || previous?.thumbnail });
    } else if (!previous.thumbnail && video.thumbnail) {
      previous.thumbnail = video.thumbnail;
    }
  }
  const excluded = new Set(exclude_urls.map(url => candidate(url)?.key).filter(Boolean));
  return [...unique.values()].filter(video => video.kind === kind && !excluded.has(video.key));
}

module.exports = { read };

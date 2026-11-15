const storage = require('../utils/imageUpload');
function urls(game = {}) {
  return [...['image', 'detail_banner', 'detail_poster', 'detail_gif'].map(key => game[key]), ...(game.screenshots || []), ...(game.platform_covers || []).flatMap(row => [row.low_quality, row.high_quality])].filter(value => typeof value === 'string');
}
function keyFromUrl(value) {
  try {
    const url = new URL(value);
    if (url.hostname !== 'res.cloudinary.com' || !process.env.CLOUD_NAME) return null;
    const prefix = `/${process.env.CLOUD_NAME}/image/upload/`;
    if (!url.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(url.pathname.slice(prefix.length)).replace(/^v\d+\//, '').replace(/\.webp$/, '');
    if (!path.startsWith('game/') || path.includes('..') || !/^[\p{L}\p{N}_/-]+$/u.test(path)) return null;
    return path;
  } catch { return null; }
}
async function cleanup(previous, current) {
  const retained = new Set(urls(current).map(keyFromUrl).filter(Boolean));
  const removed = [...new Set(urls(previous).map(keyFromUrl).filter(key => key && !retained.has(key)))];
  const failures = [];
  for (const key of removed) {
    try { await storage.removeReplacedCopies({ cloudinary: { image: { key }, preview: { key: `${key}-preview-64` } } }, {}); }
    catch { failures.push(key); }
  }
  return failures;
}
module.exports = { cleanup, keyFromUrl };

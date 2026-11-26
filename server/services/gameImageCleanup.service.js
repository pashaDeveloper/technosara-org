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
function arvanKeyFromUrl(value) {
  try {
    const base = new URL(process.env.ARVAN_PUBLIC_BASE_URL);
    const url = new URL(value);
    const prefix = base.pathname.replace(/\/$/, '') + '/';
    if (url.origin !== base.origin || !url.pathname.startsWith(prefix)) return null;
    const key = decodeURIComponent(url.pathname.slice(prefix.length));
    return /^game\/[\p{L}\p{N}_-]+\/(?:screenshot\/)?[\p{L}\p{N}_-]+-[\w-]{12}\.webp$/u.test(key) ? key : null;
  } catch { return null; }
}
async function cleanup(previous, current) {
  const existing = urls(current);
  const old = urls(previous);
  const failures = [];
  for (const [provider, keyFor, previewFor] of [
    ['arvan', arvanKeyFromUrl, key => key.replace(/\.webp$/, '-preview-64.webp')],
    ['cloudinary', keyFromUrl, key => `${key}-preview-64`],
  ]) {
    const retained = new Set(existing.map(keyFor).filter(Boolean));
    const removed = new Set(old.map(keyFor).filter(key => key && !retained.has(key)));
    for (const key of removed) {
      try { await storage.removeReplacedCopies({ [provider]: { image: { key }, preview: { key: previewFor(key) } } }, {}); }
      catch { failures.push(key); }
    }
  }
  return failures;
}
module.exports = { cleanup, keyFromUrl };

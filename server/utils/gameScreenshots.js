const sharp = require('sharp');
const remote = require('../services/remoteImage.service');

async function isPortrait(buffer) {
  const { width, height, orientation } = await sharp(buffer).metadata();
  const rotated = orientation >= 5 && orientation <= 8;
  return rotated ? width > height : height > width;
}

async function filterScreenshots(urls, existing = []) {
  if (!Array.isArray(urls)) return urls;
  const previous = new Set(existing);
  const accepted = new Map();
  const pending = [...new Set(urls.filter(url => typeof url === 'string' && url && !previous.has(url)))];
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, async () => {
    while (index < pending.length) {
      const url = pending[index++];
      try {
        const { buffer } = await remote.download(url);
        accepted.set(url, !await isPortrait(buffer));
      } catch {
        accepted.set(url, false);
      }
    }
  }));
  return urls.filter(url => previous.has(url) || accepted.get(url));
}

module.exports = { isPortrait, filterScreenshots };

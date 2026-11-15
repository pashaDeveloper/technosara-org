const crypto = require('node:crypto');
const { translatePersian } = require('./translation.service');
const cache = new Map();
function plainDescription(value) {
  return String(value || '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n').replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => Number(code) <= 0x10ffff ? String.fromCodePoint(Number(code)) : '')
    .replace(/\n{3,}/g, '\n\n').trim();
}
async function localizeDlc(content, translator = translatePersian) {
  const text = plainDescription(content.description);
  const key = crypto.createHash('sha256').update(text).digest('hex');
  let entry = cache.get(key);
  if (!entry || entry.expires < Date.now() || translator !== translatePersian) {
    if (cache.size >= 200) cache.delete(cache.keys().next().value);
    entry = { expires: Date.now() + 3600000, promise: translator(text, undefined, { sourceLanguage: 'en', targetLanguage: 'fa', longText: true }).then(result => result.translation) };
    if (translator === translatePersian) cache.set(key, entry);
  }
  try {
    const description = await entry.promise;
    if (!/[\u0600-\u06ff]/.test(description || '')) throw new Error('ترجمهٔ فارسی توضیحات دریافت نشد.');
    return { ...content, description, short_description: description.slice(0, 300) };
  } catch (error) { if (cache.get(key) === entry) cache.delete(key); error.status ||= 502; throw error; }
}
module.exports = { plainDescription, localizeDlc };

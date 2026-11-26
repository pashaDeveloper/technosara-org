const storage = require('../utils/imageUpload');
const settingsService = require('./uploadSettings.service');
const remote = require('./remoteImage.service');
const compress = require('../utils/compressImage');
const slug = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'untitled';
async function saveImage(doc, game, kind, title, field, sourceField, role = '', refreshSource) {
  const url = refreshSource || doc[field];
  if (!url || (!refreshSource && ['arvan', 'cloudinary'].some(provider => doc.image_storage?.[provider]?.image?.url === url))) return;
  const settings = await settingsService.read();
  const maxBytes = kind === 'trophy' && /^https:\/\/images-eds-ssl\.xboxlive\.com\//i.test(url) ? 20 * 1024 * 1024 : undefined;
  const { buffer } = await remote.download(url, 0, maxBytes);
  const { full, preview } = await compress(buffer, settings, false, false, maxBytes);
  const name = slug(title);
  const folder = `game/${slug(game.title || game.name)}/${kind}/${name}`;
  const filename = role ? `${role}-${name}` : name;
  const copies = await storage.uploadPair(folder, full, preview, storage.createClients('arvan'), 'arvan', undefined, filename);
  const previous = { [field]: doc[field], [sourceField]: doc[sourceField], preview_url: doc.preview_url, image_storage: doc.image_storage };
  if (refreshSource) previous.import_errors = doc.import_errors;
  try {
    if (refreshSource) await remote.download(copies.arvan.image.url);
    doc[sourceField] = url; doc[field] = copies.arvan.image.url; doc.preview_url = copies.arvan.preview.url; doc.image_storage = copies;
    if (refreshSource) doc.import_errors = (doc.import_errors || []).filter(error => error !== 'image');
    await doc.save();
  }
  catch (error) { Object.assign(doc, previous); await storage.removeReplacedCopies(copies, {}); throw error; }
}
async function refreshDlcCover(content, game, source, price) {
  if (!content) throw Object.assign(new Error('ابتدا افزونه را به بازی متصل کنید.'), { status: 404 });
  if (!source) throw Object.assign(new Error('فروشگاه برای این افزونه کاوری برنگرداند.'), { status: 422 });
  await saveImage(content, game, 'dlc', content.title_en || content.title, 'image', 'source_image_url', '', source);
  return { content: content.toObject(), title: content.title, price, ...require('./importCompletion').completion(content, 'dlc') };
}
const translations = new Map();
async function persian(text) {
  if (!text?.trim()) return '';
  if (/[\u0600-\u06ff]/.test(text)) return text;
  if (translations.has(text)) return translations.get(text);
  const result = await require('./translation.service').translatePersian(text, undefined, { sourceLanguage: 'en', targetLanguage: 'fa', longText: true });
  if (!/[\u0600-\u06ff]/.test(result.translation || '')) throw new Error('ترجمه فارسی دریافت نشد.');
  if (translations.size >= 1000) translations.delete(translations.keys().next().value);
  translations.set(text, result.translation); return result.translation;
}
async function enrich(doc, game, kind, source = {}) {
  const errors = [], keys = kind === 'trophy' ? ['name', 'description', 'locked_description'] : ['title', 'description', 'short_description'];
  // Commit English source text first, independently of translation or storage.
  for (const key of keys) if (!doc[`${key}_en`]) doc[`${key}_en`] = source[key] ?? doc[key] ?? '';
  await doc.save();
  for (const key of keys) {
    try { if (!doc[`${key}_fa`] && doc[`${key}_en`]) doc[`${key}_fa`] = await persian(require('./dlcLocalization.service').plainDescription(doc[`${key}_en`])); }
    catch { errors.push(`translation:${key}`); }
  }
  if (kind === 'dlc') {
    if (doc.description_fa && (!doc.description || doc.description === doc.description_en)) doc.description = doc.description_fa;
    if (doc.short_description_fa && (!doc.short_description || doc.short_description === doc.short_description_en)) doc.short_description = doc.short_description_fa;
  }
  await doc.save();
  try { await saveImage(doc, game, kind, doc.name_en || doc.title_en, kind === 'trophy' ? 'icon_url' : 'image', kind === 'trophy' ? 'source_icon_url' : 'source_image_url'); }
  catch { errors.push('image'); }
  if (kind === 'dlc') {
    const copies = { ...doc.screenshot_storage };
    for (const [index, url] of (doc.screenshots || []).entries()) {
      if (['arvan', 'cloudinary'].some(provider => copies[index]?.[provider]?.image?.url === url)) continue;
      const imageDoc = { image: url, async save() { const old = doc.screenshots[index]; doc.screenshots[index] = this.image; copies[index] = this.image_storage; doc.screenshot_storage = copies; doc.markModified?.('screenshot_storage'); try { await doc.save(); } catch (error) { doc.screenshots[index] = old; delete copies[index]; throw error; } } };
      try { await saveImage(imageDoc, game, kind, doc.title_en, 'image', 'source_image_url', 'screenshot'); }
      catch { errors.push(`screenshot:${index}`); }
    }
  }
  doc.import_errors = errors; await doc.save();
  if (errors.length) throw Object.assign(new Error('اطلاعات انگلیسی ذخیره شد؛ تکمیل ترجمه یا آپلود خودکار تصاویر ناموفق بود. تلاش مجدد موارد موفق را حفظ می‌کند.'), { status: 502 });
}
module.exports = { enrich, saveImage, refreshDlcCover, persian, slug };

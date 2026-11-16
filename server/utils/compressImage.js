const sharp = require('sharp');
const MAX_BYTES = 5 * 1024 * 1024;
async function compressImage(buffer, settings, animated = false, preservePreviewDimensions = false) {
  if (buffer.length > MAX_BYTES) throw Object.assign(new Error('Image exceeds 5 MB'), { status: 400 });
  try {
    const image = sharp(buffer, { animated, limitInputPixels: 25000000 });
    const meta = await image.metadata();
    if (animated ? !['gif', 'webp'].includes(meta.format) || (meta.pages || 1) > 150 : !['png', 'jpeg', 'webp'].includes(meta.format) || (meta.pages || 1) > 1) throw new Error('Unsupported image');
    const full = await image.rotate().resize({ width: settings.maxDimension, height: settings.maxDimension, fit: 'inside', withoutEnlargement: true }).webp({ quality: settings.quality }).toBuffer();
    let preview = preservePreviewDimensions ? sharp(full, { limitInputPixels: 25000000 }) : sharp(buffer, { limitInputPixels: 25000000 }).rotate().resize(settings.previewSize, settings.previewSize, { fit: 'cover' });
    if (settings.blur) preview = preview.blur(settings.blur);
    const low = await preview.webp({ quality: settings.previewQuality }).toBuffer();
    return { full, preview: low };
  } catch (error) {
    throw Object.assign(new Error(animated ? 'Invalid GIF/WebP (maximum 150 frames)' : 'Image must be a valid PNG, JPEG or WebP'), { status: 400 });
  }
}
module.exports = compressImage;

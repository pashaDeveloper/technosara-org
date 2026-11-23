const sharp = require('sharp');
const MAX_BYTES = 5 * 1024 * 1024;
const DETAIL_BANNER_MIN_BYTES = 700 * 1024;

async function encodeDetailBanner(image, quality, original, originalBytes) {
  const encode = quality => image.clone().webp({ quality, effort: 5, smartSubsample: true }).toBuffer();
  if (originalBytes < DETAIL_BANNER_MIN_BYTES) return original || encode(Math.max(88, quality));

  const preferredQuality = Math.max(70, quality);
  const initial = await encode(preferredQuality);
  let best = original;
  let bestBelow = initial;
  let low = 70;
  let high = 100;
  const consider = candidate => {
    if (candidate.length >= DETAIL_BANNER_MIN_BYTES) {
      if (!best || candidate.length < best.length) best = candidate;
    } else if (candidate.length > bestBelow.length) bestBelow = candidate;
  };
  consider(initial);
  if (initial.length >= DETAIL_BANNER_MIN_BYTES) high = preferredQuality - 1;
  else low = preferredQuality + 1;
  while (low <= high) {
    const next = Math.floor((low + high) / 2);
    const candidate = await encode(next);
    consider(candidate);
    if (candidate.length >= DETAIL_BANNER_MIN_BYTES) high = next - 1;
    else low = next + 1;
  }
  return best || bestBelow;
}

async function compressImage(buffer, settings, animated = false, preservePreviewDimensions = false, maxBytes = MAX_BYTES, detailBanner = false) {
  if (buffer.length > maxBytes) throw Object.assign(new Error(`Image exceeds ${maxBytes / (1024 * 1024)} MB`), { status: 400 });
  try {
    const image = sharp(buffer, { animated, limitInputPixels: 25000000 });
    const meta = await image.metadata();
    if (animated ? !['gif', 'webp'].includes(meta.format) || (meta.pages || 1) > 150 : !['png', 'jpeg', 'webp'].includes(meta.format) || (meta.pages || 1) > 1) throw new Error('Unsupported image');
    // Keep the original detail artwork dimensions within WebP's format limit.
    const dimension = detailBanner ? 16383 : settings.maxDimension;
    const resize = { width: dimension, height: dimension, fit: 'inside', withoutEnlargement: true };
    const canKeepOriginal = meta.format === 'webp' && (meta.pages || 1) === 1 && !meta.exif && !meta.icc && !meta.xmp
      && meta.width <= dimension && meta.height <= dimension;
    const resized = image.rotate().resize(resize);
    let full;
    if (detailBanner) full = await encodeDetailBanner(resized, settings.quality, canKeepOriginal ? buffer : null, buffer.length);
    else {
      const encoded = await resized.webp({ quality: settings.quality, effort: 5, smartSubsample: !animated }).toBuffer();
      full = canKeepOriginal && buffer.length <= encoded.length ? buffer : encoded;
    }
    let preview = sharp(buffer, { limitInputPixels: 25000000 }).rotate();
    if (preservePreviewDimensions && animated) preview = sharp(full, { limitInputPixels: 25000000 });
    else preview = preservePreviewDimensions ? preview.resize(resize) : preview.resize(settings.previewSize, settings.previewSize, { fit: 'cover' });
    if (settings.blur) preview = preview.blur(settings.blur);
    const low = await preview.webp({ quality: settings.previewQuality }).toBuffer();
    return { full, preview: low };
  } catch (error) {
    throw Object.assign(new Error(animated ? 'Invalid GIF/WebP (maximum 150 frames)' : 'Image must be a valid PNG, JPEG or WebP'), { status: 400 });
  }
}
module.exports = compressImage;

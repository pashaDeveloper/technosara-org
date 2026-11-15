// Prefer existing Cloudinary copies when reading panel data; keep storage metadata intact.
export function preferCloudinaryImages(value) {
  if (Array.isArray(value)) return value.map(preferCloudinaryImages);
  if (!value || typeof value !== 'object') return value;

  const result = Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    key === 'copies' || key === 'image_storage' ? item : preferCloudinaryImages(item),
  ]));
  const catalog = value.image_storage?.cloudinary;
  if (catalog?.image?.url) {
    for (const field of ['image', 'logo', 'logo_url', 'photo']) {
      if (typeof value[field] === 'string' && value[field]) result[field] = catalog.image.url;
    }
    if (catalog.preview?.url) result.preview_url = catalog.preview.url;
  }

  const copy = value.copies?.cloudinary;
  if (copy?.image?.url && typeof value.url === 'string') {
    result.url = copy.image.url;
    result.key = copy.image.key;
    result.public_id = copy.image.key;
    result.storage = 'cloudinary';
    if (copy.preview?.url) result.blur = {
      ...value.blur, url: copy.preview.url, public_id: copy.preview.key,
    };
  }
  return result;
}

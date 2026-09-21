const objectId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

async function validatePlatformRelations(body, id, Platform, Brand) {
  if (body.brand_id != null && body.brand_id !== '') {
    if (!objectId(body.brand_id) || !Brand || !await Brand.exists({ _id: body.brand_id })) return 'برند انتخاب‌شده معتبر نیست';
  }
  let parent = body.parent_id;
  const visited = new Set(id ? [String(id).toLowerCase()] : []);
  while (parent != null && parent !== '') {
    if (!objectId(parent)) return 'پلتفرم والد معتبر نیست';
    const key = parent.toLowerCase();
    if (visited.has(key)) return 'رابطه والد و فرزند نمی‌تواند حلقه ایجاد کند';
    visited.add(key);
    const record = await Platform.findById(parent).select('parent_id');
    if (!record) return 'پلتفرم والد پیدا نشد';
    parent = record.parent_id ? String(record.parent_id) : null;
  }
  return null;
}

module.exports = { validatePlatformRelations };

function completion(doc, kind) {
  const keys = kind === 'trophy' ? ['name', 'description', 'locked_description'] : ['title', 'description', 'short_description'];
  const translated = keys.every(key => !(doc[`${key}_en`] || doc[key]) || Boolean(doc[`${key}_fa`]));
  const image = kind === 'trophy' ? doc.icon_url : doc.image;
  const uploaded = (!image || doc.image_storage?.cloudinary?.image?.url === image) &&
    (kind !== 'dlc' || (doc.screenshots || []).every((url, index) => doc.screenshot_storage?.[index]?.cloudinary?.image?.url === url));
  return { registered: true, translated, uploaded, complete: translated && uploaded && !doc.import_errors?.length };
}
module.exports = { completion };

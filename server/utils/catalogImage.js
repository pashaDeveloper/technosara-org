const localImage = value => /^\/uploads\/(genres|platforms|people|companies)\/[a-z0-9-]+\/[a-f0-9-]+\/(image|preview-64)\.webp$/.test(value);

function catalogImage(schema) {
  schema.add({ preview_url: { type: String, default: '' }, image_storage: { type: Object, default: null } });
}
module.exports = { catalogImage, localImage };

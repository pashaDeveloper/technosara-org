function generateSlug(value) {
  return typeof value === 'string'
    ? value.normalize('NFKC').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '')
    : '';
}

module.exports = { generateSlug };

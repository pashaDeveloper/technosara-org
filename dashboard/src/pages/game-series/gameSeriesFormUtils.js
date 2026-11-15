export function englishSlug(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function gameSeriesBody(values) {
  return {
    name_en: values.name.trim(), name: values.name.trim(),
    short_name: values.short_name?.trim() || '',
    slug: values.slug.trim(), description: values.description?.trim() || '',
    image: values.image || '',
  };
}

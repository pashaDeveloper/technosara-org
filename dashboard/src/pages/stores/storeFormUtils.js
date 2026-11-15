import { definition } from './definitions.js';

export function englishSlug(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function storeBody(values) {
  return Object.fromEntries(definition.fields.map(field => [field.key,
    field.type === 'checkbox' ? Boolean(values[field.key]) : field.key === 'country_code' ? (values[field.key]?.trim().toUpperCase() || null) : String(values[field.key] ?? '').trim()
  ]));
}

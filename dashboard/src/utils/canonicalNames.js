// Existing forms keep their Persian/English inputs; the server stores the
// canonical English `name` and the explicitly separate `name_fa`.
export function localizedNames(value) {
  if (Array.isArray(value)) return value.map(localizedNames);
  if (!value || typeof value !== 'object') return value;
  const result = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localizedNames(item)]));
  if (typeof value.name === 'string' && (value.name_fa || value.name_en)) {
    result.name_en = value.name_en || value.name;
    result.name = value.name_fa || value.name;
  }
  return result;
}
export function canonicalBody(body) {
  if (!body || typeof body !== 'object') return body;
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const result = new FormData();
    for (const [key, value] of body.entries()) result.append(key, value);
    const english = body.get('name_en'), local = body.get('name');
    if (typeof english === 'string' && english.trim()) {
      if (typeof local === 'string' && /[\u0600-\u06ff]/.test(local)) result.set('name_fa', local);
      result.set('name', english);
    }
    return result;
  }
  if (typeof body.name_en !== 'string' || !body.name_en.trim()) return body;
  return { ...body, name: body.name_en, ...(/[\u0600-\u06ff]/.test(body.name || '') ? { name_fa: body.name } : {}) };
}
export const usesLegacyNames = url => /^\/?(?:genres|game-tags|game-modes|platforms|companies|stores|games)(?:\/|\?|$)/.test(url || '');

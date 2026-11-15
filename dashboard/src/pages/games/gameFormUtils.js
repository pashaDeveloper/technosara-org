import { definition, providerFields, formValues } from './definitions.js';
export const englishSlug = value => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export function gameBody(values) {
  const body = Object.fromEntries(definition.fields.map(field => {
    let value = values[field.key];
    if (field.type === 'json') value = JSON.parse(value || 'null');
    if (field.type === 'number') value = value === '' ? null : Number(value);
    if (typeof value === 'string') value = value.trim();
    if (field.type === 'multiple') value = [...new Set(value || [])];
    if (['relation', 'date', 'url'].includes(field.type)) value = value || null;
    if (field.type === 'list') {
      const seen = new Set();
      value = (value || []).map(item => item.trim()).filter(item => {
        const key = item.normalize('NFKC').toLowerCase();
        if (!item || seen.has(key)) return false;
        seen.add(key); return true;
      });
    }
    return [field.key, value];
  }));
  return body;
}

const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export function providerOptionMatches(items, rows) {
 return (items || []).map(item => {
   const names = (typeof item === 'string' ? [item] : [item.value, item.name]).filter(Boolean).map(normalize);
   const byValue = typeof item === 'object' && item.value ? rows.filter(row => row.value === item.value) : [];
   const matches = byValue.length ? byValue : rows.filter(row => [row.value,row.key,row.slug,row.code,row.short_name,row.name,row.name_en,row.title].some(value => value && names.includes(normalize(value))));
   return { label: typeof item === 'string' ? item : item.name || item.value, matches };
 });
}
export function matchProviderOptions(items, rows) {
 return [...new Set(providerOptionMatches(items, rows).flatMap(({ matches }) => matches.length === 1 ? [matches[0]._id] : []))];
}
export function providerFormValues(game) {
 const defaults = formValues(definition);
 const result = Object.fromEntries([...providerFields.map(field => field.key), 'short_description', 'description', 'release_date'].map(key => [key, defaults[key]]));
 result.detail_poster = '';
 result.detail_banner = '';
 result.detail_gif = '';
 result.title = game.name;
 result.slug = englishSlug(game.name || '');
 for(const field of definition.fields) if(!['multiple','relation'].includes(field.type) && Object.hasOwn(game,field.key)) {
   let value = game[field.key];
   if (value == null || value === 'null') {
     value = field.type === 'json' ? (['rating','playtime'].includes(field.key) ? {} : []) : field.type === 'checkbox' ? false : '';
   }
   if (['rating', 'playtime'].includes(field.key)) {
     value = Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
       if (key === 'percentiles' && Array.isArray(item)) return [[key, item.filter(n => typeof n === 'number' && Number.isFinite(n))]];
       return typeof item === 'number' && Number.isFinite(item) ? [[key, item]] : [];
     }));
   }
   result[field.key]=field.type==='json'?JSON.stringify(value,null,2):value;
 }
 if(game.release_date) result.status=game.release_date>new Date().toISOString().slice(0,10)?'upcoming':'released';
 return result;
}

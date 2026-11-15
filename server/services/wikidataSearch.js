// Public title catalog; source IDs are Wikidata IDs, never Sony product IDs.
module.exports = async function wikidataSearch(query, request) {
  const endpoint = params => {
    const url = new URL('https://www.wikidata.org/w/api.php');
    url.search = new URLSearchParams({ format: 'json', ...params });
    return url;
  };
  const get = async params => {
    const data = await request(endpoint(params), true, 8000);
    if (data.error) throw new Error('Wikidata catalog unavailable');
    return data;
  };
  const found = await get({ action: 'wbsearchentities', search: query, language: 'en', type: 'item', limit: '30' });
  if (!Array.isArray(found.search)) throw new Error('Invalid Wikidata search response');
  const ids = found.search.map(item => item.id).filter(id => /^Q\d+$/.test(id || ''));
  if (!ids.length) return [];
  const data = await get({ action: 'wbgetentities', ids: ids.join('|'), props: 'labels|claims', languages: 'en|mul' });
  if (!data.entities) throw new Error('Invalid Wikidata entity response');
  const platforms = entity => (entity.claims?.P400 || []).filter(claim => claim.rank !== 'deprecated')
    .map(claim => claim.mainsnak?.datavalue?.value?.id).filter(id => /^Q\d+$/.test(id || ''));
  const platformIds = [...new Set(ids.flatMap(id => platforms(data.entities[id] || {})))];
  if (!platformIds.length) return [];
  const labels = await get({ action: 'wbgetentities', ids: platformIds.slice(0, 50).join('|'), props: 'labels', languages: 'en|mul' });
  if (!labels.entities) throw new Error('Invalid Wikidata platform response');
  return ids.flatMap(id => {
    const entity = data.entities[id];
    const title = (entity?.labels?.en?.value || entity?.labels?.mul?.value);
    const names = platforms(entity || {}).map(platform => (labels.entities[platform]?.labels?.en?.value || labels.entities[platform]?.labels?.mul?.value))
      .filter(name => /^PlayStation(?:\s|$)|^PS Vita$/i.test(name || ''));
    return title && names.length ? [{ provider: 'wikidata', platform_family: 'playstation', id,
      title, image: null, platforms: [...new Set(names)], source_url: `https://www.wikidata.org/wiki/${id}` }] : [];
  }).slice(0, 10);
};


const cache = new Map();
async function search(title, fetcher = fetch) {
  if (typeof title !== 'string' || title.trim().length < 2 || title.length > 200) return [];
  const query = title.trim();
  const hit = cache.get(query);
  if (fetcher === fetch && hit?.expires > Date.now()) return hit.rows;
  try {
    const url = new URL('https://api.psray.net/trophies');
    url.searchParams.set('q', query); url.searchParams.set('per_page', '10'); url.searchParams.set('page', '1');
    const response = await fetcher(url.href, { headers: { Accept: 'application/json', 'Accept-Language': 'en-US' }, redirect: 'error', signal: AbortSignal.timeout(12000) });
    if (!response.ok) return [];
    const text = await response.text();
    if (text.length > 2 * 1024 * 1024) return [];
    const data = JSON.parse(text);
    if (!Array.isArray(data.data)) return [];
    const rows = data.data.filter(row => /^NPWR\d{5,9}_\d{2}$/.test(row.np_communication_id || '') && typeof row.name === 'string' && Array.isArray(row.platform)).map(row => ({
      ppid: row.np_communication_id, title: row.name,
      platforms: row.platform.filter(value => ['PS4', 'PS5'].includes(value)).map(value => value.toLowerCase()),
      requires_confirmation: true, mapping_source: 'psray-search'
    })).filter(row => row.platforms.length);
    if (fetcher === fetch) {
      if (cache.size >= 200) cache.delete(cache.keys().next().value);
      cache.set(query, { rows, expires: Date.now() + 3600000 });
    }
    return rows;
  } catch { return []; }
}
module.exports = { search };

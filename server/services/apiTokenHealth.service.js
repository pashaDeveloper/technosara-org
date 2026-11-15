function classify(status, message = '') {
  if (status === 429 || /quota|rate.?limit|allowance.*exceed/i.test(message)) return 'quota';
  if (status === 402) return 'subscription';
  if ((status === 401 || status === 403) && /expir/i.test(message)) return 'expired';
  if (status === 401) return 'invalid_or_expired';
  if (status === 403) return /invalid.*(?:api|key|token)|(?:api|key|token).*invalid/i.test(message) ? 'invalid_or_expired' : 'forbidden';
  return 'unavailable';
}
async function probe(key, value, fetcher = fetch) {
  const options = { redirect: 'error', signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } };
  let url;
  if (key === 'THEGAMESDB_API_KEY') url = `https://api.thegamesdb.net/v1/Platforms?apikey=${encodeURIComponent(value)}`;
  else if (key === 'GAMEBRAIN_API_KEY') { url = 'https://api.gamebrain.co/v1/games?query=Halo&limit=1'; options.headers['x-api-key'] = value; }
  else if (key === 'PLATPRICES_API_KEY') { url = 'https://platprices.com/api/v2/games/search?q=Halo&region=US'; options.headers['X-API-Key'] = value; }
  else if (key === 'OPENXBL_API_KEY') { url = 'https://api.xbl.io/v2/account'; options.headers['X-Authorization'] = value; }
  else if (key === 'PSN_NPSSO') {
    const query = new URLSearchParams({ access_type: 'offline', client_id: '09515159-7237-4370-9b40-3806e67c0891', redirect_uri: 'com.scee.psxandroid.scecompcall://redirect', response_type: 'code', scope: 'psn:mobile.v2.core psn:clientapp' });
    url = `https://ca.account.sony.com/api/authz/v3/oauth/authorize?${query}`;
    options.redirect = 'manual'; options.headers.Cookie = `npsso=${value}`;
  } else return 'unverified';
  try {
    const response = await fetcher(url, options);
    if (key === 'PSN_NPSSO' && [301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location') || '';
      if (location.startsWith('com.scee.psxandroid.scecompcall://redirect')) {
        const parsed = new URL(location);
        if (parsed.searchParams.get('code')) return 'valid';
        if (['login_required', 'invalid_grant', 'invalid_token'].includes(parsed.searchParams.get('error'))) return 'invalid_or_expired';
      }
      return 'unverified';
    }
    const chunks = []; let size = 0;
    for await (const chunk of response.body || []) {
      size += chunk.length; if (size > 256 * 1024) return response.ok ? 'unverified' : classify(response.status);
      chunks.push(Buffer.from(chunk));
    }
    let data;
    try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return response.ok ? 'unverified' : classify(response.status); }
    const message = [data.message, data.description, typeof data.error === 'string' ? data.error : data.error?.message, data.status].filter(value => typeof value === 'string').join(' ');
    const code = Number(data.code);
    if (!response.ok || code >= 400) return classify(response.ok ? code : response.status, message);
    if (data.success === false || data.error) return /expir/i.test(message) ? 'expired' : /invalid.*(?:key|token)|unauthoriz/i.test(message) ? 'invalid_or_expired' : 'unverified';
    if (key === 'THEGAMESDB_API_KEY' && !data.data?.platforms) return 'unverified';
    if (key === 'PLATPRICES_API_KEY' && data.success !== true) return 'unverified';
    if (key === 'PSN_NPSSO') return 'unverified';
    return 'valid';
  } catch { return 'unavailable'; }
}
module.exports = { probe, classify };

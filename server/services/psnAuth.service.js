const crypto = require('node:crypto');
const fail = (message, status = 502) => Object.assign(new Error(message), { status });
const base = 'https://ca.account.sony.com/api/authz/v3/oauth';
const client = '09515159-7237-4370-9b40-3806e67c0891';
const redirect = 'com.scee.psxandroid.scecompcall://redirect';
let session, pending;
async function tokens(body, fetcher) {
  const response = await fetcher(`${base}/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(client + ':ucPjka5tntB2KqsP').toString('base64') }, body: new URLSearchParams(body), signal: AbortSignal.timeout(20000), redirect: 'error' });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw fail('احراز هویت PSN ناموفق بود؛ توکن جدید را تنظیم کنید.', 401);
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expires: Date.now() + Math.max(0, Number(data.expires_in || 3600) - 60) * 1000 };
}
async function authorize(fetcher = fetch) {
  const npsso = process.env.PSN_NPSSO?.trim();
  if (!npsso) throw fail('توکن PSN تنظیم نشده است.', 503);
  const fingerprint = crypto.createHash('sha256').update(npsso).digest('hex');
  if (session?.fingerprint === fingerprint && session.expires > Date.now()) return session.accessToken;
  if (pending?.fingerprint === fingerprint) return pending.promise;
  const promise = (async () => {
    let auth;
    if (session?.fingerprint === fingerprint && session.refreshToken) {
      try { auth = await tokens({ refresh_token: session.refreshToken, grant_type: 'refresh_token', token_format: 'jwt' }, fetcher); } catch { /* A fresh NPSSO exchange is the fallback. */ }
    }
    if (!auth) {
      const query = new URLSearchParams({ access_type: 'offline', client_id: client, redirect_uri: redirect, response_type: 'code', scope: 'psn:mobile.v2.core psn:clientapp' });
      const response = await fetcher(`${base}/authorize?${query}`, { headers: { Cookie: `npsso=${npsso}` }, redirect: 'manual', signal: AbortSignal.timeout(20000) });
      const location = response.headers.get('location');
      const code = location && new URL(location).searchParams.get('code');
      if (!code) throw fail('توکن PSN معتبر نیست یا منقضی شده است.', 401);
      auth = await tokens({ code, redirect_uri: redirect, grant_type: 'authorization_code', token_format: 'jwt' }, fetcher);
    }
    session = { ...auth, fingerprint };
    return session.accessToken;
  })();
  pending = { fingerprint, promise };
  try { return await promise; } catch (error) { if (error.status) throw error; throw fail('اتصال به PSN ناموفق بود.'); }
  finally { if (pending?.promise === promise) pending = null; }
}
async function request(path, fetcher = fetch) {
  const token = await authorize(fetcher);
  let response;
  try { response = await fetcher('https://m.np.playstation.com' + path, { headers: { Authorization: `Bearer ${token}`, 'Accept-Language': 'en-US' }, signal: AbortSignal.timeout(20000), redirect: 'error' }); }
  catch { throw fail('اتصال به PSN ناموفق بود.'); }
  if (!response.ok) {
    if (response.status === 401) session = null;
    throw fail(({ 401: 'نشست PSN معتبر نیست؛ دوباره تلاش کنید.', 403: 'دسترسی به اطلاعات PSN مجاز نیست.', 404: 'اطلاعات این نسخه در PSN پیدا نشد.', 429: 'محدودیت درخواست PSN؛ کمی بعد دوباره تلاش کنید.' })[response.status] || 'PSN پاسخ معتبر نداد.', [401, 403, 404, 429].includes(response.status) ? response.status : 502);
  }
  try { return await response.json(); } catch { throw fail('پاسخ PSN معتبر نیست.'); }
}
module.exports = { request };

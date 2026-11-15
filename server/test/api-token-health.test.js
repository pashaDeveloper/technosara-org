const { test } = require('node:test');
const assert = require('node:assert/strict');
const { probe } = require('../services/apiTokenHealth.service');
const { createService } = require('../services/apiTokens.service');
test('token validation separates expiration, auth failures, quota, permission and network errors', async () => {
  for (const [code, message, expected] of [[401, 'token expired', 'expired'], [401, 'Unauthorized', 'invalid_or_expired'], [403, 'Forbidden', 'forbidden'], [403, 'Invalid API key', 'invalid_or_expired'], [429, 'Too many requests', 'quota'], [402, 'Payment required', 'subscription'], [500, 'server error', 'unavailable']]) {
    assert.equal(await probe('GAMEBRAIN_API_KEY', 'test-secret', async () => Response.json({ message }, { status: code })), expected);
  }
  assert.equal(await probe('OPENXBL_API_KEY', 'test-secret', async () => { throw Error('offline'); }), 'unavailable');
  assert.equal(await probe('THEGAMESDB_API_KEY', 'test-secret', async () => Response.json({ code: 403, status: 'Invalid API key' })), 'invalid_or_expired');
  assert.equal(await probe('THEGAMESDB_API_KEY', 'test-secret', async () => Response.json({ code: 200, data: { platforms: {} } })), 'valid');
  assert.equal(await probe('PLATPRICES_API_KEY', 'test-secret', async () => new Response('<html>Sign in</html>')), 'unverified');
});
test('PSN check requires an authorization code and keeps credentials in its request only', async () => {
  assert.equal(await probe('PSN_NPSSO', 'test-secret', async (url, options) => {
    assert.ok(url.startsWith('https://ca.account.sony.com/'));
    assert.equal(options.headers.Cookie, 'npsso=test-secret');
    assert.equal(options.redirect, 'manual');
    return new Response(null, { status: 302, headers: { Location: 'com.scee.psxandroid.scecompcall://redirect?code=test-code' } });
  }), 'valid');
  assert.equal(await probe('PSN_NPSSO', 'test-secret', async () => new Response(null, { status: 302, headers: { Location: 'https://example.com/login' } })), 'unverified');
});
test('health checks are cached per credential, coalesce requests, omit missing keys and redact secrets', async () => {
  const env = { GAMEBRAIN_API_KEY: 'first-secret' }; let calls = 0;
  const service = createService('unused.env', env, async () => { calls++; return 'expired'; });
  assert.equal(service.status().find(row => row.key === 'GAMEBRAIN_API_KEY').health, 'unverified');
  await Promise.all([service.check(), service.check()]);
  assert.equal(calls, 1);
  await service.check(); assert.equal(calls, 1);
  assert.equal(service.status().find(row => row.key === 'GAMEBRAIN_API_KEY').health, 'expired');
  env.GAMEBRAIN_API_KEY = 'replacement-secret';
  assert.equal(service.status().find(row => row.key === 'GAMEBRAIN_API_KEY').health, 'unverified');
  await service.check(); assert.equal(calls, 2);
  const output = JSON.stringify(service.status());
  assert.ok(!output.includes('first-secret') && !output.includes('replacement-secret'));
  assert.equal(service.status().find(row => row.key === 'PSN_NPSSO').health, 'missing');
});
test('a late check for an old credential cannot mark its replacement expired', async () => {
  const env = { GAMEBRAIN_API_KEY: 'old-secret' }; let finish;
  const service = createService('unused.env', env, () => new Promise(resolve => { finish = resolve; }));
  const check = service.check(); env.GAMEBRAIN_API_KEY = 'new-secret'; finish('expired'); await check;
  assert.equal(service.status().find(row => row.key === 'GAMEBRAIN_API_KEY').health, 'unverified');
});

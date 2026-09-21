import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../server/package.json', import.meta.url));
const express = require('express');
const cookieParser = require('cookie-parser');

test('React dashboard proxies setup, login, session and logout to Express', { timeout: 30000 }, async t => {
  const fixture = require('./test/fixtures/dashboard')();
  const app = express();
  app.use(express.json(), cookieParser());
  app.use('/api', require('./routes/dashboard.route')(fixture));
  const upstream = app.listen(0, '127.0.0.1');
  await new Promise(resolve => upstream.once('listening', resolve));
  t.after(() => new Promise(resolve => { upstream.closeAllConnections(); upstream.close(resolve); }));
  const previous = process.env.API_BASE;
  process.env.API_BASE = `http://127.0.0.1:${upstream.address().port}`;
  t.after(() => { if (previous === undefined) delete process.env.API_BASE; else process.env.API_BASE = previous; });
  const vite = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  t.after(() => vite.close());
  await vite.listen();
  const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
  const request = (path, body, cookie) => fetch(`${base}/api${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', origin: base, ...(cookie ? { cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.deepEqual(await (await request('/account/setup')).json(), { required: true });
  const credentials = { username: 'admin@example.com', password: 'password-123', confirmPassword: 'password-123' };
  assert.equal((await request('/setup/2', credentials)).status, 201);
  assert.deepEqual(await (await request('/account/setup')).json(), { required: false });
  assert.equal((await request('/account/me')).status, 401);
  assert.equal((await request('/account/login', { email: credentials.username, password: 'wrong' })).status, 401);
  const login = await request('/account/login', { email: credentials.username, password: credentials.password });
  assert.equal(login.status, 200);
  assert.deepEqual(await login.json(), { status: 'success' });
  assert.match(login.headers.get('set-cookie'), /HttpOnly/);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await (await request('/account/me', undefined, cookie)).json()).data.role, 'superAdmin');
  assert.equal((await request('/admin/users', credentials, cookie)).status, 201);
  fixture.state.role = 'admin';
  assert.equal((await request('/admin/users', credentials, cookie)).status, 403);
  const logout = await request('/account/logout', {}, cookie);
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/i);
  assert.equal((await request('/account/me')).status, 401);
  const forbidden = await fetch(base + '/api/account/logout', { method: 'POST', headers: { origin: 'https://foreign.example' } });
  assert.equal(forbidden.status, 403);
  assert.equal((await request('/missing')).status, 404);
  assert.match(await (await fetch(base + '/my-profile')).text(), /src\/main.jsx/);
});

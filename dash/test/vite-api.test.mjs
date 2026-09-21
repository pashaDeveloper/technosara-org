import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { createServer } from 'vite';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../server/package.json', import.meta.url));
const express = require('express');
const cookieParser = require('cookie-parser');

test('Vite proxies account requests to the main Express router', { timeout: 30000 }, async (t) => {
  const app = express();
  app.use(express.json(), cookieParser());
  app.use('/api', require('./routes/dashboard.route')(require('./test/fixtures/dashboard')()));
  const upstream = createHttpServer(app);
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { upstream.closeAllConnections(); upstream.close(resolve); }));
  const previousBase = process.env.API_BASE;
  process.env.API_BASE = `http://127.0.0.1:${upstream.address().port}`;
  t.after(() => {
    if (previousBase === undefined) delete process.env.API_BASE;
    else process.env.API_BASE = previousBase;
  });
  const vite = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  t.after(() => vite.close());
  await vite.listen();
  const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
  assert.deepEqual(await (await fetch(base + '/api/account/setup')).json(), { required: true });
  assert.equal((await fetch(base + '/api/missing')).status, 404);
  const denied = await fetch(base + '/api/account/logout', { method: 'POST', headers: { origin: 'https://foreign.example' } });
  assert.equal(denied.status, 403);
  const login = await fetch(base + '/api/auth/password', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: base },
    body: JSON.stringify({ username: 'admin@example.com', password: 'password-123' }),
  });
  assert.equal(login.status, 200);
  assert.match(login.headers.get('set-cookie'), /HttpOnly/);
  const page = await fetch(base + '/administrators/new', { headers: { accept: 'text/html' } });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /app\/main.ts/);
});

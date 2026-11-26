const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createService } = require('../services/apiTokens.service');

test('token updates persist, apply immediately, preserve unrelated settings and never return secrets', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'technosara-api-tokens-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, '.env');
  await fs.writeFile(file, '# settings\r\nPORT=8080\r\nTHEGAMESDB_API_KEY=old-secret\r\nexport THEGAMESDB_API_KEY=duplicate\r\n');
  const env = { THEGAMESDB_API_KEY: 'old-secret' };
  const service = createService(file, env);
  const result = await service.update({ key: 'THEGAMESDB_API_KEY', value: 'new-secret' });
  assert.equal(env.THEGAMESDB_API_KEY, 'new-secret');
  const saved = await fs.readFile(file, 'utf8');
  assert.ok(saved.includes('# settings\r\nPORT=8080\r\n'));
  assert.equal(saved.match(/THEGAMESDB_API_KEY=/g).length, 1);
  assert.ok(!saved.includes('old-secret'));
  assert.ok(!JSON.stringify(result).includes('new-secret'));
  assert.equal(result.find(row => row.key === 'THEGAMESDB_API_KEY').configured, true);
  await Promise.all([service.update({ key: 'OPENXBL_API_KEY', value: 'xbox-test-secret' }), service.update({ key: 'GAMEBRAIN_API_KEY', value: 'gamebrain-test-secret' })]);
  const persisted = require('dotenv').parse(await fs.readFile(file));
  assert.equal(persisted.OPENXBL_API_KEY, env.OPENXBL_API_KEY);
  assert.equal(persisted.GAMEBRAIN_API_KEY, env.GAMEBRAIN_API_KEY);
});

test('token settings reject unrelated env keys and multiline injection without changing the file', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'technosara-api-token-validation-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, '.env'); await fs.writeFile(file, 'PORT=8080\n');
  const env = {};
  const service = createService(file, env);
  for (const input of [{ key: 'TOKEN_SECRET', value: 'hijack' }, { key: 'GAMEBRAIN_API_KEY', value: 'secret\nPORT=9999' }, { key: 'GAMEBRAIN_API_KEY', value: '' }, { key: 'GAMEBRAIN_API_KEY', value: 'a'.repeat(8193) }]) await assert.rejects(service.update(input), { status: 400 });
  assert.equal(await fs.readFile(file, 'utf8'), 'PORT=8080\n');
  assert.deepEqual(env, {});
  const missing = createService(path.join(dir, 'missing', '.env'), env);
  await assert.rejects(missing.update({ key: 'GAMEBRAIN_API_KEY', value: 'new-secret' }), { status: 500 });
  assert.deepEqual(env, {});
});

test('Arvan settings are saved together and never return either S3 key', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'technosara-arvan-settings-'));
  const file = path.join(dir, '.env');
  t.after(async () => { await fs.unlink(file); await fs.rmdir(dir); });
  const env = {};
  const service = createService(file, env);
  const fields = {
    ARVAN_S3_ENDPOINT: 'https://s3.ir-thr-at1.arvanstorage.ir',
    ARVAN_S3_BUCKET: 'test-bucket',
    ARVAN_PUBLIC_BASE_URL: 'https://assets.example.test',
    ARVAN_S3_REGION: 'us-east-1',
    ARVAN_S3_ACCESS_KEY: 'test-access-key',
    ARVAN_S3_SECRET_KEY: 'test-secret-key',
  };
  const status = await service.updateArvan(fields);
  assert.deepEqual(require('dotenv').parse(await fs.readFile(file)), fields);
  assert.deepEqual(env, fields);
  assert.ok(status.every(row => row.configured));
  assert.ok(status.filter(row => row.secret).every(row => !Object.hasOwn(row, 'value')));
  assert.throws(() => service.updateArvan({ ...fields, ARVAN_S3_ENDPOINT: 'https://example.test' }), { status: 400 });
  await service.updateArvan({ ...fields, ARVAN_S3_ACCESS_KEY: '', ARVAN_S3_SECRET_KEY: '' });
  assert.deepEqual(require('dotenv').parse(await fs.readFile(file)), fields);
});

test('API token routes restrict reads and updates to the owner', async t => {
  const express = require('express');
  const jwt = require('jsonwebtoken');
  const service = require('../services/apiTokens.service');
  t.mock.method(service, 'status', () => [{ key: 'GAMEBRAIN_API_KEY', configured: true }]);
  const updates = [];
  t.mock.method(service, 'update', async body => { updates.push(body); return service.status(); });
  const original = process.env.TOKEN_SECRET;
  process.env.TOKEN_SECRET = 'api-token-route-test-secret';
  t.after(() => { if (original === undefined) delete process.env.TOKEN_SECRET; else process.env.TOKEN_SECRET = original; });
  const app = express(); app.use(express.json()); app.use('/api/admin', require('../routes/admin.route'));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (role, method = 'GET', suffix = '') => fetch(`http://127.0.0.1:${server.address().port}/api/admin/api-tokens${suffix}`, {
    method, headers: { 'Content-Type': 'application/json', ...(role && { Authorization: `Bearer ${jwt.sign({ role }, process.env.TOKEN_SECRET)}` }) },
    ...(method === 'PATCH' && { body: JSON.stringify({ key: 'GAMEBRAIN_API_KEY', value: 'new-secret' }) }),
  });
  assert.equal((await request()).status, 401);
  assert.equal((await request('admin')).status, 403);
  assert.equal((await request('admin', 'PATCH')).status, 403);
  assert.equal((await request('admin', 'PATCH', '/arvan')).status, 403);
  assert.equal((await request('superAdmin', 'GET', '/arvan')).status, 200);
  assert.equal(updates.length, 0);
  const response = await request('superAdmin', 'PATCH');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.ok(!(await response.text()).includes('new-secret'));
  assert.equal(updates.length, 1);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const api = require('../services/gamebrain.service');
const { catalogPreview } = require('../scripts/refresh-gamebrain.cjs');

test('catalog preview excludes counts and unsupported platform metadata', () => {
  const preview = catalogPreview({ filter_options: [{ key: 'platform', values: [{ key: 'xbox_series_xs', name: 'Xbox Series X|S', count: 42 }] }, { key: 'tag', values: [{ key: 'first_person', name: 'First-Person', count: 100 }] }] });
  assert.deepEqual(preview.platforms[0], { external_key: 'xbox_series_xs', fields: { code: 'xbox_series_xs', value: 'xbox_series_xs', name: 'Xbox Series X|S' } });
  assert.deepEqual(preview.tags[0].fields, { name: 'First-Person', value: 'first_person', slug: 'first-person' });
});

test('client authenticates in headers, forwards filters, preserves responses and handles failures', async t => {
  const previousKey = process.env.GAMEBRAIN_API_KEY;
  process.env.GAMEBRAIN_API_KEY = 'test-key';
  t.after(() => { if (previousKey === undefined) delete process.env.GAMEBRAIN_API_KEY; else process.env.GAMEBRAIN_API_KEY = previousKey; });
  const calls = [];
  const mockedFetch = t.mock.method(global, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ results: [], filter_options: [], arbitrary_provider_field: true }));
  });
  const filters = JSON.stringify([{ key: 'genre', values: [{ value: 'action' }], connection: 'OR' }]);
  assert.equal((await api.search({ query: 'God of War', filters })).arbitrary_provider_field, true);
  assert.equal(calls[0].url.searchParams.get('filters'), filters);
  assert.equal(calls[0].url.searchParams.has('api-key'), false);
  assert.equal(calls[0].options.headers['x-api-key'], 'test-key');
  await api.suggestions({ query: 'god' }); await api.details('1273796'); await api.similar('1273796'); await api.news('1273796');
  assert.deepEqual(calls.map(call => call.url.pathname), ['/v1/games', '/v1/games/suggestions', '/v1/games/1273796', '/v1/games/1273796/similar', '/v1/games/1273796/news']);
  for (const action of [() => api.details('../bad'), () => api.search({ limit: '51' }), () => api.search({ 'api-key': 'bad' }), () => api.search({ query: [] }), () => api.search({ filters: '{}' })]) assert.throws(action, { status: 400 });
  mockedFetch.mock.mockImplementation(async () => new Response('secret upstream body', { status: 429 }));
  await assert.rejects(api.details('1'), { status: 429, message: 'GameBrain HTTP 429' });
  mockedFetch.mock.mockImplementation(async () => new Response('not json'));
  await assert.rejects(api.details('1'), { status: 502 });
  delete process.env.GAMEBRAIN_API_KEY;
  await assert.rejects(api.details('1'), { status: 503 });
});

test('HTTP endpoints require an administrator and preserve provider response shape', async t => {
  const previousSecret = process.env.TOKEN_SECRET;
  process.env.TOKEN_SECRET = 'gamebrain-test-secret';
  t.after(() => { if (previousSecret === undefined) delete process.env.TOKEN_SECRET; else process.env.TOKEN_SECRET = previousSecret; });
  t.mock.method(api, 'suggestions', async () => ({ results: [{ id: 42, name: 'God of War' }] }));
  t.mock.method(api, 'details', async () => ({ id: 42, name: 'God of War' }));
  let imported;
  const app = express();
  app.use(express.json());
  app.use('/api/gamebrain', require('../routes/gamebrain.route'));
  app.use(require('../middleware/error.middleware'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/gamebrain`;
  assert.equal((await fetch(`${url}/games`)).status, 401);
  const token = role => ({ Authorization: `Bearer ${jwt.sign({ role }, process.env.TOKEN_SECRET)}` });
  assert.equal((await fetch(`${url}/games`, { headers: token('customer') })).status, 403);
  const response = await fetch(`${url}/games/suggestions?query=god`, { headers: token('admin') });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { results: [{ id: 42, name: 'God of War' }] } });
  const mapped = await fetch(`${url}/games/42`, { headers: token('admin') });
  assert.deepEqual((await mapped.json()).data, { id: 42, name: 'God of War' });
  const headers = { ...token('admin'), 'Content-Type': 'application/json' };
  assert.equal((await fetch(`${url}/games/42/import`, { method: 'POST', headers: { ...token('customer'), 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
  assert.equal((await fetch(`${url}/games/42/import`, { method: 'POST', headers, body: JSON.stringify({ include_news: 'true' }) })).status, 404);
  assert.equal((await fetch(`${url}/games/42/import`, { method: 'POST', headers, body: JSON.stringify({ include_news: true, slug: 'god-of-war', status: 'released' }) })).status, 404);
  assert.equal(imported, undefined);
  const sync = await fetch(`${url}/filters/sync`, { method: 'POST', headers });
  assert.equal(sync.status, 404);
});

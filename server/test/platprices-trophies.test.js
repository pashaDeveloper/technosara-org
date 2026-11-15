const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const api = require('../services/platpricesTrophies.service');
const Game = require('../models/game.model');
const Platform = require('../models/platform.model');
const Group = require('../models/achievementGroup.model');
const Achievement = require('../models/achievement.model');
const card = { PPID: 123, ProductName: 'Example PS5', IsPS4: 0, IsPS5: 1 };
const list = { ppid: 123, list_id: 'example-list', total: 2, counts: { bronze: 1, silver: 0, gold: 0, platinum: 1 }, trophies: [
  { id: 0, name: 'First', description: 'First trophy', grade: 'bronze', earned_rate: 0, icon: 'https://example.com/icon.webp' },
  { id: 1, name: 'All done', description: 'Everything', grade: 'platinum', earned_rate: null },
] };
function key(t) {
  const before = process.env.PLATPRICES_API_KEY;
  process.env.PLATPRICES_API_KEY = 'test-platprices-key';
  t.after(() => { if (before == null) delete process.env.PLATPRICES_API_KEY; else process.env.PLATPRICES_API_KEY = before; });
}
function fixture(calls = []) {
  return async (url, options) => {
    const parsed = new URL(url); calls.push(parsed);
    assert.equal(parsed.hostname, 'platprices.com');
    assert.equal(parsed.searchParams.get('region'), 'US');
    assert.equal(parsed.searchParams.has('key'), false);
    assert.equal(options.headers['X-API-Key'], 'test-platprices-key');
    const data = parsed.pathname.endsWith('/search') ? [card, { ...card, PPID: 124, IsDLC: 1 }]
      : parsed.pathname.endsWith('/trophies') ? list : card;
    return new Response(JSON.stringify({ success: true, data }));
  };
}
test('missing key fails before any external request', async t => {
  key(t); delete process.env.PLATPRICES_API_KEY;
  await assert.rejects(api.candidates({ title: 'Example' }, async () => { throw new Error('Must not call'); }), { status: 503 });
});
test('authenticated search excludes DLC and returns exact platform choices', async t => {
  key(t); const rows = await api.candidates({ title: 'Example' }, fixture());
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].platforms, ['ps5']);
  assert.equal(rows[0].ppid, '123');
});
test('automatic discovery only returns PlayStation editions identified by a store link', async t => {
  key(t);
  const fetcher = async () => new Response(JSON.stringify({ success: true, data: [{ ...card, PSNID: 'PPSA12345' }, { ...card, PPID: 124, PSNID: 'PPSA99999' }] }));
  const input = { title: 'Example', linkedOnly: true, official_stores: [{ url: 'https://store.playstation.com/en-us/product/UP0001-PPSA12345_00-EXAMPLE0000000000' }] };
  assert.deepEqual((await api.candidates(input, fetcher)).map(row => row.ppid), ['123']);
  assert.deepEqual(await api.candidates({ ...input, official_stores: [] }, fetcher), []);
});
test('previews every base trophy, preserving zero IDs and percentages, and rejects a wrong platform', async t => {
  key(t); const calls = [];
  const result = await api.preview({ ppid: '123', platform: 'ps5' }, fixture(calls));
  assert.equal(result.total, 2);
  assert.equal(result.trophies[0].external_id, '0');
  assert.equal(result.trophies[0].rarity, 0);
  assert.equal(result.trophies[1].rarity, null);
  assert.ok(result.trophies.every(row => row.is_dlc === false && row.dlc_id === null));
  await assert.rejects(api.preview({ ppid: '123', platform: 'ps4' }, fixture()), { status: 400 });
  for (const row of result.trophies) await new Achievement({ ...row, game_id: new mongoose.Types.ObjectId(), platform_id: new mongoose.Types.ObjectId(), achievement_group_id: new mongoose.Types.ObjectId() }).validate();
});
test('rejects truncated, duplicated, mismatched and malformed trophy lists', () => {
  for (const bad of [null, { ...list, ppid: 999 }, { ...list, total: 3 }, { ...list, trophies: [list.trophies[0], list.trophies[0]] }, { ...list, trophies: [null, null] }, { ...list, counts: { ...list.counts, bronze: 0 } }]) assert.throws(() => api.normalizeTrophies(bad, '123'), { status: 502 });
});
test('quota and invalid-key errors do not expose upstream bodies or secrets', async t => {
  key(t);
  for (const status of [401, 429]) await assert.rejects(api.candidates({ title: 'Example' }, async () => new Response('private upstream body', { status })), error => error.status === status && !error.message.includes('private'));
});
test('imports a base group once, reuses trophy identities, and preserves manual edits', async t => {
  key(t);
  const gameId = new mongoose.Types.ObjectId(), platformId = new mongoose.Types.ObjectId();
  let group; const saved = new Map(); let creates = 0;
  t.mock.method(Game, 'findById', async () => ({ title: 'Example' }));
  t.mock.method(require('../services/automaticMedia.service'), 'enrich', async () => {});
  t.mock.method(Platform, 'findOne', async () => ({ _id: platformId }));
  t.mock.method(Group, 'findOne', async () => group);
  t.mock.method(Group, 'findOneAndUpdate', async (_, update) => { creates++; group = new Group(update.$setOnInsert); return group; });
  t.mock.method(Group.prototype, 'save', async function () { await this.validate(); return this; });
  t.mock.method(Achievement, 'findOneAndUpdate', async (identity, update) => {
    if (!saved.has(identity.external_id)) saved.set(identity.external_id, new Achievement(update.$setOnInsert));
    await saved.get(identity.external_id).validate(); return saved.get(identity.external_id);
  });
  t.mock.method(Achievement, 'countDocuments', async () => saved.size);
  const body = { ppid: '123', platform: 'ps5' };
  assert.equal((await api.importTrophies(gameId, body, null, fixture())).saved, 2);
  assert.equal(group.group_type, 'base_game');
  saved.get('0').name = 'Manual name';
  await api.importTrophies(gameId, body, null, fixture());
  assert.equal(saved.size, 2); assert.equal(creates, 1);
  assert.equal(saved.get('0').name, 'Manual name');
  assert.equal(group.total_achievements, 2);
  group.game_id = new mongoose.Types.ObjectId();
  await assert.rejects(api.importTrophies(gameId, body, null, fixture()), { status: 409 });
});

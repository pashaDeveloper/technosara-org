const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Game = require('../models/game.model');
const drafts = require('../services/gameDraft.service');
const api = require('../services/gamebrain.service');

test('automatic game creation preserves source data, omits media assets and publishes by default', async t => {
  const source = { id: 42, name: 'A Game', description: 'Original Gamebrain text', short_description: 'Short', image: 'https://example.com/image.jpg', screenshots: ['https://example.com/shot.jpg'], videos: ['https://example.com/video.mp4'], future_field: { enabled: false }, rating: { mean: 0.8 } };
  let inserted;
  t.mock.method(api, 'details', async () => source);
  t.mock.method(Game, 'findOne', () => ({ lean: async () => null }));
  t.mock.method(Game, 'findOneAndUpdate', (query, update, options) => {
    assert.deepEqual(query, { id: 42 }); assert.equal(options.upsert, true);
    inserted = update.$setOnInsert;
    assert.equal(Object.hasOwn(inserted, 'updatedAt'), false);
    assert.equal(Object.hasOwn(inserted, 'createdAt'), false);
    return { lean: async () => ({ ...inserted, _id: new mongoose.Types.ObjectId() }) };
  });
  const result = await drafts.select('42', new mongoose.Types.ObjectId());
  assert.equal(result.local.created, true); assert.equal(inserted.publication_status, 'published'); assert.equal(inserted.auto_draft, true);
  assert.deepEqual(inserted.gamebrain_source, source); assert.equal(inserted.description, source.description);
  assert.equal(inserted.short_description, source.short_description);
  assert.equal(inserted.image, undefined); assert.ok(!inserted.screenshots?.length); assert.ok(!inserted.videos?.length);
  assert.equal(inserted.slug, 'a-game-42');
});

test('selecting a saved game needs no API and preserves manually edited data', async t => {
  const record = { _id: new mongoose.Types.ObjectId(), id: 42, title: 'A Game', description: 'Edited by admin', auto_draft: false, gamebrain_source: { id: 42, name: 'A Game', description: 'Original' } };
  t.mock.method(Game, 'findOne', () => ({ lean: async () => record }));
  t.mock.method(api, 'details', () => { throw new Error('API unavailable'); });
  const result = await drafts.select('42', new mongoose.Types.ObjectId());
  assert.equal(result.local.record.description, 'Edited by admin'); assert.equal(result.data.description, 'Original'); assert.equal(result.local.created, false);
});

test('offline search returns saved games marked green without duplicating remote IDs', async t => {
  const record = { _id: new mongoose.Types.ObjectId(), id: 42, title: 'Halo Infinite', publication_status: 'draft' };
  t.mock.method(Game, 'find', () => ({ limit() { return this; }, lean: async () => [record] }));
  t.mock.method(api, 'lookupSuggestions', async () => { throw new Error('API unavailable'); });
  let result = await drafts.suggestions({ query: 'Halo' });
  assert.equal(result.results[0].saved, true); assert.equal(result.results[0].record_id, String(record._id)); assert.ok(result.warning);
  api.lookupSuggestions.mock.mockImplementation(async () => ({ results: [{ id: 42, name: 'Halo Infinite' }] }));
  result = await drafts.suggestions({ query: 'Halo' }); assert.equal(result.results.length, 1); assert.equal(result.results[0].saved, true);
});

test('save failures retain fetched details and report failure; invalid IDs never call API', async t => {
  t.mock.method(api, 'details', async () => ({ id: 9, name: 'Game Nine' }));
  t.mock.method(Game, 'findOne', () => ({ lean: async () => null }));
  t.mock.method(Game, 'findOneAndUpdate', () => { throw new Error('Database unavailable'); });
  const result = await drafts.select('9', new mongoose.Types.ObjectId()); assert.ok(result.saveError); assert.equal(result.data.id, 9); assert.equal(result.local, undefined);
  await assert.rejects(drafts.select('../bad'), { status: 400 });
});

test('remote image downloads reject private, loopback, mapped IPv6 and unsafe URLs', async () => {
  const service = require('../services/remoteImage.service');
  for (const ip of ['127.0.0.1', '10.0.0.2', '172.16.1.2', '192.168.1.1', '169.254.169.254', '::1', '::ffff:127.0.0.1', 'fc00::1']) assert.equal(service.publicAddress(ip), false);
  assert.equal(service.publicAddress('8.8.8.8'), true);
  for (const url of ['http://example.com/a.jpg', 'https://127.0.0.1/a.jpg', 'https://example.com:8080/a.jpg', 'file:///test.png']) await assert.rejects(service.download(url), { status: 400 });
});

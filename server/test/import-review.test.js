const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Review = require('../models/importReview.model');
const service = require('../services/importReview.service');
const api = require('../services/gamebrain.service');
const importer = require('../services/gamebrainImport.service');
const id = () => new mongoose.Types.ObjectId();

test('preview stores a review snapshot without writing catalog data', async t => {
  const admin = id(); let created;
  t.mock.method(api, 'details', async () => ({ id: 12, name: 'Example', themes: [{ value: 'fantasy', name: 'Fantasy' }] }));
  t.mock.method(Review, 'create', async fields => { created = new Review(fields); await created.validate(); return created; });
  t.mock.method(importer, 'importPayload', async () => { throw new Error('Must not import during preview'); });
  const result = await service.previewGame('12', { slug: 'example', status: 'released' }, admin);
  assert.equal(result.raw.name, 'Example'); assert.equal(created.state, 'pending');
  assert.equal(String(created.creator), String(admin));
  assert.equal(created.payload.game.themes[0].value, 'fantasy');
  assert.ok(result.expires_at > new Date());
  assert.equal(created.approvalReview.status, '');
});

test('confirmation is explicit, bound to the owner, imports the stored snapshot and records approval', async t => {
  const admin = id(), review = new Review({ creator: admin, kind: 'game', payload: { game: { id: 12, name: 'Shown snapshot' } }, options: { slug: 'example', status: 'released' }, expires_at: new Date(Date.now() + 60000) });
  const select = value => ({ select: async () => value });
  t.mock.method(Review, 'findOne', query => { assert.equal(String(query.creator), String(admin)); return select(review); });
  let claimed = false;
  t.mock.method(Review, 'findOneAndUpdate', (query, update) => { assert.deepEqual(query.state.$in, ['pending', 'failed']); claimed = true; review.state = update.$set.state; return select(review); });
  t.mock.method(Review.prototype, 'save', async function () { return this; });
  let imported;
  t.mock.method(importer, 'importPayload', async (raw, options) => { imported = { raw, options }; return { game_id: 'local-game', id: 12 }; });
  await assert.rejects(service.confirm(String(review._id), {}, admin), { status: 400 });
  assert.equal(claimed, false);
  const result = await service.confirm(String(review._id), { confirmed: true, payload: { name: 'Tampered' } }, admin);
  assert.equal(result.game_id, 'local-game'); assert.equal(imported.raw.name, 'Shown snapshot');
  assert.equal(imported.options.approvalReview.status, 'approved');
  assert.equal(review.state, 'imported'); assert.equal(review.approvalReview.status, 'approved');
  imported = undefined;
  assert.deepEqual(await service.confirm(String(review._id), { confirmed: true }, admin), result);
  assert.equal(imported, undefined);
});

test('expired, missing and concurrent reviews cannot be imported', async t => {
  const admin = id();
  t.mock.method(Review, 'findOne', () => ({ select: async () => null }));
  await assert.rejects(service.confirm(String(id()), { confirmed: true }, admin), { status: 404 });
  const review = new Review({ kind: 'filters', payload: {}, creator: admin, expires_at: new Date(0) });
  t.mock.method(Review, 'findOne', () => ({ select: async () => review }));
  await assert.rejects(service.confirm(String(review._id), { confirmed: true }, admin), { status: 409 });
  review.expires_at = new Date(Date.now() + 60000);
  t.mock.method(Review, 'findOneAndUpdate', () => ({ select: async () => null }));
  await assert.rejects(service.confirm(String(review._id), { confirmed: true }, admin), { status: 409 });
});

test('filter confirmation uses reviewed payload and retryable failures preserve the review', async t => {
  const admin = id(), review = new Review({ kind: 'filters', payload: { filter_options: [{ key: 'theme', values: [] }] }, creator: admin, expires_at: new Date(Date.now() + 60000) });
  t.mock.method(Review, 'findOne', () => ({ select: async () => review }));
  t.mock.method(Review, 'findOneAndUpdate', () => ({ select: async () => review }));
  t.mock.method(Review.prototype, 'save', async function () { return this; });
  t.mock.method(importer, 'syncFilterPayload', async () => { throw new Error('Database failed'); });
  await assert.rejects(service.confirm(String(review._id), { confirmed: true }, admin), /Database failed/);
  assert.equal(review.state, 'failed');
  assert.equal(review.payload.filter_options[0].key, 'theme');
});

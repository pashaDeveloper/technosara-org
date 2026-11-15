const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Store = require('../models/store.model');
const service = require('../services/store.service');
const seeds = require('../data/stores.json');
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } });

test('store country accepts known codes, normalizes case and rejects unknown countries', () => {
  const store = new Store({ ...seeds[0], country_code: ' us ' });
  assert.equal(store.country_code, 'US');
  assert.equal(store.validateSync(), undefined);
  assert.ok(new Store({ ...seeds[0], country_code: 'XX' }).validateSync()?.errors.country_code);
  assert.equal(new Store({ ...seeds[0], country_code: null }).validateSync(), undefined);
  const res = response();
  service.getStoreCountries({}, res);
  assert.ok(res.body.data.some(country => country.code === 'IR' && country.name_fa));
});

test('country updates persist, can be cleared and are preserved when omitted', async t => {
  let update;
  t.mock.method(Store, 'findByIdAndUpdate', async (id, values) => { update = values; return { image_storage: null }; });
  for (const [body, expected] of [[{ country_code: 'US' }, 'US'], [{ country_code: '' }, null], [{ country_code: null }, null]]) {
    await service.updateStore({ params: { id: String(new mongoose.Types.ObjectId()) }, body }, response());
    assert.equal(update.country_code, expected);
  }
  await service.updateStore({ params: { id: String(new mongoose.Types.ObjectId()) }, body: { name: 'Changed' } }, response());
  assert.equal(Object.hasOwn(update, 'country_code'), false);
});

test('store seed data validates, has unique identifiers and preserves integration fields', async () => {
  assert.equal(new Set(seeds.map(item => item.code)).size, seeds.length);
  for (const item of seeds) {
    const store = new Store(item);
    await store.validate();
    assert.ok(store.name_en && store.description);
    assert.equal(new URL(store.website_url).protocol, 'https:');
    assert.equal(store.is_active, true);
  }
  assert.ok(new Store({ name: 'Test', code: 'bad code' }).validateSync());
  assert.ok(new Store({ name: 'Test', code: 'test', image: 'javascript:alert(1)' }).validateSync());
  for (const field of ['api_base_url', 'metadata', 'logo_url', 'created_at', 'deleted_at', 'image_storage']) assert.ok(Store.schema.path(field));
});

test('create assigns creator and order and saves bilingual details and legacy store settings', async t => {
  t.mock.method(Store, 'findOne', () => ({ sort: () => ({ select: async () => ({ sort_order: 7 }) }) }));
  let saved;
  t.mock.method(Store.prototype, 'save', async function () { saved = this; return this; });
  const res = response();
  const creator = new mongoose.Types.ObjectId();
  await service.addStore({ admin: { _id: creator }, body: { ...seeds[0], api_available: true, api_base_url: 'https://api.example.com', metadata: '{"custom":true}', sort_order: 999 } }, res);
  assert.equal(res.code, 201);
  assert.equal(saved.sort_order, 8);
  assert.equal(String(saved.creator), String(creator));
  assert.equal(saved.name_en, 'Steam');
  assert.equal(saved.api_available, true);
  assert.deepEqual(saved.metadata, { custom: true });
});

test('partial update preserves integration fields and supports clearing images and false flags', async t => {
  let update;
  t.mock.method(Store, 'findByIdAndUpdate', async (id, values) => { update = values; return { image_storage: null }; });
  await service.updateStore({ params: { id: String(new mongoose.Types.ObjectId()) }, body: { name: 'Changed', image: '', is_active: false } }, response());
  assert.equal(update.name, 'Changed');
  assert.equal(update.image, '');
  assert.equal(update.is_active, false);
  for (const key of ['api_base_url', 'metadata', 'supports_prices', 'sort_order']) assert.equal(Object.hasOwn(update, key), false);
  t.mock.method(Store, 'findByIdAndUpdate', async () => null);
  const res = response();
  await service.updateStore({ params: { id: String(new mongoose.Types.ObjectId()) }, body: {} }, res);
  assert.equal(res.code, 404);
});

test('listing escapes search metacharacters, clamps paging and sorts consistently', async t => {
  let filter, skip, limit, sort;
  const chain = { skip(value) { skip = value; return this; }, limit(value) { limit = value; return this; }, sort(value) { sort = value; return this; }, async populate() { return []; } };
  t.mock.method(Store, 'find', query => { filter = query; return chain; });
  t.mock.method(Store, 'countDocuments', async () => 0);
  const res = response();
  await service.getStores({ query: { page: '-2', limit: '999', search: 'a.*[', status: 'inactive' } }, res);
  assert.equal(res.code, 200);
  assert.equal(skip, 0);
  assert.equal(limit, 100);
  assert.deepEqual(sort, { sort_order: 1, _id: 1 });
  assert.equal(filter.is_active, false);
  assert.equal(filter.$or[0].name.$regex, 'a\\.\\*\\[');
});

test('reordering moves a store and renumbers all items; malformed requests fail', async t => {
  const ids = Array.from({ length: 3 }, () => new mongoose.Types.ObjectId());
  t.mock.method(Store, 'find', () => ({ sort: () => ({ select: () => ({ lean: async () => ids.map(_id => ({ _id })) }) }) }));
  let operations;
  t.mock.method(Store, 'bulkWrite', async ops => { operations = ops; });
  const res = response();
  await service.reorderStore({ body: { id: String(ids[0]), targetId: String(ids[2]) } }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(operations.map(op => String(op.updateOne.filter._id)), [ids[1], ids[2], ids[0]].map(String));
  assert.deepEqual(operations.map(op => op.updateOne.update.$set.sort_order), [0, 1, 2]);
  const invalid = response();
  await service.reorderStore({ body: { id: 'bad', targetId: 'bad' } }, invalid);
  assert.equal(invalid.code, 400);
});

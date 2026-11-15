const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Brand = require('../models/brand.model');
const Platform = require('../models/platform.model');
require('../models/admin.model');
const platforms = require('../services/platform.service');
const brands = require('../services/brand.service');
test('independent brands and English platforms support safe parent/child CRUD', async t => {
  const database = `technosara_brands_test_${process.pid}_${Date.now()}`;
  await mongoose.connect('mongodb://127.0.0.1:27017', { dbName: database, serverSelectionTimeoutMS: 3000 });
  t.after(async () => { assert.equal(mongoose.connection.name, database); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  const admin = { _id: new mongoose.Types.ObjectId() };
  async function call(handler, body = {}, params = {}) {
    const res = { code: 200, status(n) { this.code = n; return this; }, json(data) { this.body = data; return this; } };
    await handler({ body, params, query: {}, admin }, res); return res;
  }
  assert.equal((await call(brands.createBrand, { name: 'Sony', slug: 'sony', company_id: new mongoose.Types.ObjectId() })).code, 201);
  const brand = await Brand.findOne({ slug: 'sony' });
  const Person = require('../models/person.model');
  const person = await Person.create({ name: 'Test Founder' });
  await call(brands.updateBrand, { founded_date: '1946-05-07', founders: [{ person_id: String(person._id), name: 'Untrusted name' }] }, { id: String(brand._id) });
  const linked = await Brand.findById(brand._id);
  assert.equal(linked.founded_date, '1946-05-07');
  assert.equal(linked.founded_year, 1946);
  assert.equal(String(linked.founders[0].person_id), String(person._id));
  assert.equal(linked.founders[0].name, person.name);
  for (const body of [{ founded_date: '2023-02-29' }, { founded_date: '2999-01-01' }, { founded_date: {} }, { founders: [{ person_id: String(new mongoose.Types.ObjectId()) }] }, { founders: [{ person_id: String(person._id) }, { person_id: String(person._id) }] }, { founders: ['Free text'] }]) {
    await assert.rejects(call(brands.updateBrand, body, { id: String(brand._id) }));
  }
  await person.softDelete();
  await assert.rejects(call(brands.updateBrand, { founders: [{ person_id: String(person._id) }] }, { id: String(brand._id) }));
  await call(brands.updateBrand, { founded_date: null, founders: [] }, { id: String(brand._id) });
  assert.equal((await Brand.findById(brand._id)).founders.length, 0);
  assert.equal((await call(brands.updateBrand, { country_code: 'JP', founded_year: 1946, activity_fields: ['Electronics', 'Gaming'], website: 'https://www.sony.com/' }, { id: String(brand._id) })).code, 200);
  const details = await Brand.findById(brand._id);
  assert.equal(details.country_code, 'JP');
  assert.equal(details.founded_year, 1946);
  assert.deepEqual([...details.activity_fields], ['Electronics', 'Gaming']);
  for (const body of [{ founded_year: 9999 }, { founded_year: 1990.5 }, { country_code: 'ZZ' }, { website: 'javascript:alert(1)' }, { activity_fields: [''] }]) {
    await assert.rejects(call(brands.updateBrand, body, { id: String(brand._id) }), error => error.name === 'ValidationError');
  }
  await call(brands.updateBrand, { founded_year: null, country_code: '', website: '', activity_fields: [] }, { id: String(brand._id) });
  assert.equal((await Brand.findById(brand._id)).founded_year, null);
  assert.equal(Object.hasOwn(brand.toObject(), 'company_id'), false);
  assert.equal((await call(platforms.createPlatform, { name: 'PS4', slug: 'ps4', brand_id: String(brand._id), english_name: 'obsolete' })).code, 201);
  const parent = await Platform.findOne({ slug: 'ps4' });
  assert.equal(Object.hasOwn(parent.toObject(), 'english_name'), false);
  for (const name of ['Jailbreak', 'Account']) assert.equal((await call(platforms.createPlatform, { name: `PS4 ${name}`, slug: `ps4-${name.toLowerCase()}`, brand_id: String(brand._id), parent_id: String(parent._id) })).code, 201);
  const child = await Platform.findOne({ slug: 'ps4-jailbreak' });
  assert.equal((await call(platforms.updatePlatform, { parent_id: String(child._id) }, { id: String(parent._id) })).code, 400);
  assert.equal((await call(platforms.updatePlatform, { brand_id: String(new mongoose.Types.ObjectId()) }, { id: String(child._id) })).code, 400);
  assert.equal((await call(platforms.deletePlatform, {}, { id: String(parent._id) })).code, 409);
  assert.equal((await call(brands.deleteBrand, {}, { id: String(brand._id) })).code, 409);
  assert.equal((await call(brands.updateBrand, { name: 'Sony Brand' }, { id: String(brand._id) })).code, 200);
  const list = await call(platforms.getPlatforms);
  assert.equal(list.body.data.length, 3);
  assert.ok(list.body.data.every(p => p.brand_id.name === 'Sony Brand'));
  assert.equal((await call(platforms.deletePlatform, {}, { id: String(child._id) })).code, 200);
  assert.equal((await call(brands.createBrand, { name: 'Unused', slug: 'unused' })).code, 201);
  const unused = await Brand.findOne({ slug: 'unused' });
  await call(brands.deleteBrand, {}, { id: String(unused._id) });
  assert.equal(await Brand.findById(unused._id), null);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./mock-catalog-storage.cjs');
const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const Admin = require('../models/admin.model');
const Person = require('../models/person.model');

test('people: independent profiles, validation, search, updates and soft deletion', async t => {
  process.env.TOKEN_SECRET = 'people-test-secret';
  const database = `technosara_people_test_${process.pid}_${Date.now()}`;
  await mongoose.connect('mongodb://127.0.0.1:27017', { dbName: database, serverSelectionTimeoutMS: 3000 });
  t.after(async () => {
    assert.equal(mongoose.connection.name, database);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  const app = express();
  app.use(express.json({ limit: '512kb' }), cookieParser());
  app.use('/api', require('../routes/admin.route'));
  app.use(require('../middleware/error.middleware'));
  const owner = await Admin.create({ name: 'Owner', email: 'people@example.com', password: 'password-123', role: 'superAdmin' });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  let cookie;
  const request = async (path, method = 'GET', body, extraHeaders = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
      method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...extraHeaders },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json(), headers: response.headers };
  };
  assert.equal((await request('/people')).status, 401);
  assert.equal((await request('/people', 'POST', { name: 'Unauthorized' })).status, 401);
  const login = await request('/account/login', 'POST', { email: owner.email, password: 'password-123' });
  assert.equal(login.status, 200);
  cookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/people', 'POST', { name: 'Origin' }, { origin: 'https://untrusted.example' })).status, 403);
  const profile = {
    name_fa: 'شخص آزمایشی', name: 'Example Person', slug: 'example-person', photo: 'data:image/png;base64,' + (await require('sharp')({ create: { width: 120, height: 80, channels: 3, background: '#8899aa' } }).png().toBuffer()).toString('base64'),
    birth_date: '1980-02-29', birthplace: 'تهران', country_code: 'IR',
    activity_fields: ['بازی‌سازی', 'هنر'], specialties: ['طراحی بازی'], positions: ['کارگردان'],
    awards: ['جایزه نمونه'], biography: 'زندگی‌نامه نمونه', website: 'https://example.com', social_links: ['https://example.com/profile'],
  };
  assert.equal((await request('/people', 'POST', { ...profile, creator: new mongoose.Types.ObjectId(), isDeleted: true })).status, 201);
  const saved = await Person.findOne({ name: profile.name });
  assert.ok(saved);
  assert.equal(String(saved.creator), String(owner._id));
  const id = String(saved._id);
  const loaded = (await request(`/people/${id}`)).body.data;
  for (const [key, value] of Object.entries(profile)) if (key !== 'photo') assert.deepEqual(loaded[key], value, key);
  assert.match(loaded.photo, /^https:\/\/arvan.example.com\/person\//);
  assert.match(loaded.preview_url, /preview-64.webp$/);
  assert.equal((await request('/people?search=Example')).body.total, 1);
  assert.equal((await request('/people?search=' + encodeURIComponent('شخص آزمایشی'))).body.total, 1);
  assert.equal(Object.hasOwn(loaded, 'english_name'), false);
  assert.equal((await request('/people?search=' + encodeURIComponent('طراحی'))).body.total, 1);
  assert.equal((await request('/people?search=%5B')).body.total, 0);
  assert.equal((await request('/people?status=inactive')).body.total, 0);
  assert.ok((await request('/people/countries')).body.data.some(country => country.code === 'IR'));
  assert.equal((await request('/people/all')).body.data[0]._id, id);
  for (const body of [{ name: ' ' }, { birth_date: '2001-02-29' }, { death_date: '1970-01-01' }, { birth_date: '2999-01-01' }, { website: 'javascript:alert(1)' }, { photo: 'javascript:alert(1)' }, { country_code: 'ZZ' }, { specialties: [''] }, { social_links: ['bad'] }]) {
    assert.equal((await request(`/people/${id}`, 'PATCH', body)).status, 400, JSON.stringify(body));
  }
  assert.equal((await request(`/people/${id}`, 'PATCH', { death_date: '2020-01-01', specialties: ['نویسندگی', 'تهیه‌کنندگی'], status: 'inactive', creator: new mongoose.Types.ObjectId() })).status, 200);
  assert.equal((await request(`/people/${id}`, 'PATCH', { birth_date: '2021-01-01' })).status, 400);
  assert.equal((await request('/people?status=inactive')).body.total, 1);
  assert.equal(String((await Person.findById(id)).creator), String(owner._id));
  assert.equal((await request(`/people/${id}`, 'PATCH', { photo: '', death_date: '', specialties: [], social_links: [] })).status, 200);
  const cleared = (await request(`/people/${id}`)).body.data;
  assert.equal(cleared.photo, '');
  assert.deepEqual(cleared.specialties, []);
  assert.equal((await request('/people/invalid-id')).status, 400);
  assert.equal((await request(`/people/${new mongoose.Types.ObjectId()}`)).status, 404);
  assert.equal((await request('/people', 'POST', { name: 'Another Person' })).status, 201);
  assert.equal((await request('/people?limit=1&page=1')).body.data.length, 1);
  assert.equal((await request('/people?limit=1&page=2')).body.data.length, 1);
  assert.equal((await request(`/people/${id}`, 'DELETE')).status, 200);
  assert.equal((await request(`/people/${id}`)).status, 404);
  assert.equal((await request(`/people/${id}`, 'PATCH', { name: 'Deleted' })).status, 404);
  assert.equal((await request(`/people/${id}`, 'DELETE')).status, 404);
  assert.equal((await request('/people')).body.total, 1);
  assert.equal((await Person.collection.findOne({ _id: saved._id })).isDeleted, true);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const Admin = require('../models/admin.model');

test('all model APIs preserve creators, validate, paginate, update and soft delete', async t => {
  process.env.TOKEN_SECRET = 'model-crud-test-secret';
  const database = `technosara_models_test_${process.pid}_${Date.now()}`;
  await mongoose.connect('mongodb://127.0.0.1:27017', { dbName: database, serverSelectionTimeoutMS: 3000 });
  t.after(async () => {
    assert.equal(mongoose.connection.name, database);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  const app = express();
  app.use(express.json(), cookieParser());
  app.use('/api', require('../routes/admin.route'));
  app.use(require('../middleware/error.middleware'));
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const owner = await Admin.create({ name: 'Owner', email: 'owner@example.com', password: 'password-123', role: 'superAdmin' });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  let cookie;
  const request = async (path, method = 'GET', body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json(), headers: response.headers };
  };
  assert.equal((await request('/games')).status, 401);
  const login = await request('/account/login', 'POST', { email: owner.email, password: 'password-123' });
  assert.equal(login.status, 200);
  cookie = login.headers.get('set-cookie').split(';')[0];
  const ids = {};
  const people = await mongoose.model('Person').create([{ name: 'Founder One' }, { name: 'Founder Two' }]);
  const records = [];
  const fixtures = [
    ['genres', 'Genre', () => ({ name: 'Action', slug: 'action' })],
    ['companies', 'Company', () => ({ name: 'Studio', slug: 'studio', type: 'developer', founded_date: '1995-02-28', founders: people.map(person => ({ person_id: String(person._id) })), key_members: people.map((person, index) => ({ person_id: String(person._id), role: index ? 'Director' : 'CEO' })) })],
    ['platforms', 'Platform', () => ({ name: 'Console', code: 'console', device_type: 'console' })],
    ['games', 'Game', () => ({ title: 'Game', slug: 'game', status: 'released', genre_ids: JSON.stringify([ids.genres]), developer_ids: JSON.stringify([ids.companies]) })],
    ['stores', 'Store', () => ({ name: 'Store', code: 'store', metadata: '{"region":"IR"}' })],
    ['editions', 'Edition', () => ({ game_id: ids.games, name: 'Standard', slug: 'standard' })],
    ['age-ratings', 'AgeRating', () => ({ game_id: ids.games, system: 'PEGI', rating: '12' })],
    ['achievement-groups', 'AchievementGroup', () => ({ game_id: ids.games, platform_id: ids.platforms, name: 'Base' })],
    ['achievements', 'Achievement', () => ({ game_id: ids.games, platform_id: ids.platforms, achievement_group_id: ids['achievement-groups'], external_id: 'first', name: 'First' })],
    ['users', 'User', () => ({ name: 'User', email: 'user@example.com', password: 'password-123' })],
    ['addresses', 'Address', () => ({ city: 'Tehran', address: 'Street', postalCode: '0123456789' })],
    ['examples', 'Example', () => ({ title: 'Example' })],
  ];
  for (const [resource, modelName, fixture] of fixtures) {
    await t.test(resource, async () => {
      const created = await request(`/${resource}`, 'POST', fixture());
      assert.equal(created.status, 201, JSON.stringify(created.body));
      assert.equal(created.body.acknowledgement, true);
      assert.ok(created.body.description);
      assert.equal(created.body.data, undefined);
      const saved = await mongoose.model(modelName).findOne({ creator: owner._id });
      assert.ok(saved);
      assert.equal(String(saved.creator), String(owner._id));
      const id = String(saved._id);
      ids[resource] = id;
      if (resource === 'companies') {
        const company = (await request(`/companies/${id}`)).body.data;
        assert.equal(company.founded_date, '1995-02-28');
        assert.equal(company.founded_year, 1995);
        assert.equal(company.founders.length, 2);
        assert.equal(company.key_members[1].role, 'Director');
        assert.equal(company.founders[0].person_id, String(people[0]._id));
        assert.equal((await request(`/companies/${id}`, 'PATCH', { founders: [{ person_id: 'bad' }] })).status, 400);
        assert.equal((await request(`/companies/${id}`, 'PATCH', { founders: [{ person_id: String(new mongoose.Types.ObjectId()) }] })).status, 400);
        assert.equal((await request(`/companies/${id}`, 'PATCH', { founders: [{ person_id: String(people[0]._id) }, { person_id: String(people[0]._id) }] })).status, 400);
        assert.equal((await request(`/companies/${id}`, 'PATCH', { founders: [{ name: 'Free text' }] })).status, 400);
        await mongoose.model('Person').findByIdAndUpdate(people[0]._id, { name: 'Updated Person' });
        assert.equal((await request(`/companies/${id}`)).body.data.founders[0].name, 'Updated Person');
        assert.equal((await request(`/companies/${id}`, 'PATCH', { founded_date: '2000-02-29', founders: [{ person_id: String(people[0]._id) }], key_members: [] })).status, 200);
        const edited = (await request(`/companies/${id}`)).body.data;
        assert.equal(edited.founded_date, '2000-02-29');
        assert.equal(edited.founded_year, 2000);
        assert.equal(edited.founders[0].name, 'Updated Person');
        assert.equal(edited.founders[0].person_id, String(people[0]._id));
        assert.deepEqual(edited.key_members, []);
        assert.equal((await request(`/companies/${id}`, 'PATCH', { founded_date: null, founders: [] })).status, 200);
        const cleared = (await request(`/companies/${id}`)).body.data;
        assert.equal(cleared.founded_date, null);
        assert.equal(cleared.founded_year, null);
        assert.deepEqual(cleared.founders, []);
      }
      records.push([resource, modelName, id]);
      const list = await request(`/${resource}?limit=1&page=1`);
      assert.equal(list.status, 200, JSON.stringify(list.body));
      assert.equal(list.body.data.length, 1);
      assert.equal(list.body.data[0].creator._id, String(owner._id));
      assert.equal(list.body.page, undefined);
      assert.equal(list.body.pages, undefined);
      assert.ok(list.body.total >= 1);
      assert.equal((await request(`/${resource}?page=0`)).status, 200);
      assert.ok((await request(`/${resource}?search=.*`)).body.total >= 1);
      assert.equal((await request(`/${resource}/${id}`)).status, 200);
      const changed = await request(`/${resource}/${id}`, 'PATCH', {});
      assert.equal(changed.status, 200, JSON.stringify(changed.body));
      assert.equal(changed.body.data, undefined);
      assert.equal(String((await mongoose.model(modelName).findById(id)).creator), String(owner._id));
      assert.equal((await request(`/${resource}/${id}`, 'PATCH', { creator: new mongoose.Types.ObjectId() })).status, 200);
      assert.equal(String((await mongoose.model(modelName).findById(id)).creator), String(owner._id));
      assert.equal((await request(`/${resource}/invalid-id`)).status, 400);
      assert.equal((await request(`/${resource}/${new mongoose.Types.ObjectId()}`)).body.data, null);
    });
  }
  assert.equal((await request('/games', 'POST', { title: 'Bad', slug: 'bad', status: 'released', genre_ids: '["bad"]' })).status, 500);
  assert.equal((await request('/stores', 'POST', { name: 'Bad', code: 'bad', metadata: '{bad' })).status, 500);
  const userPassword = await request(`/users/${ids.users}`, 'PATCH', { password: 'updated-password' });
  assert.equal(userPassword.status, 200);
  const user = await mongoose.model('User').findById(ids.users).select('+password');
  assert.equal(await require('bcryptjs').compare('updated-password', user.password), true);
  for (const [resource, modelName, id] of records.reverse()) {
    const deleted = await request(`/${resource}/${id}`, 'DELETE');
    assert.equal(deleted.status, 200, `${resource}: ${JSON.stringify(deleted.body)}`);
    assert.equal((await request(`/${resource}/${id}`)).body.data, null);
    assert.equal((await request(`/${resource}/${id}`, 'DELETE')).status, 404);
    const document = await mongoose.model(modelName).collection.findOne({ _id: new mongoose.Types.ObjectId(id) });
    assert.equal(document.isDeleted, true);
    assert.ok(document.deletedAt || document.deleted_at);
  }
});

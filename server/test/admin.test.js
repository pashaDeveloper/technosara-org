const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const mongoose = require('mongoose');
const Admin = require('../models/admin.model');

test('admin registration, login and authorization', async (t) => {
  process.env.TOKEN_SECRET = 'test-only-secret';
  await mongoose.connect('mongodb://127.0.0.1:27017', {
    dbName: `technosara_auth_test_${process.pid}_${Date.now()}`,
    serverSelectionTimeoutMS: 3000,
  });
  t.after(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  const app = express();
  app.use(express.json());
  app.use('/api/admin', require('../routes/admin.route'));
  app.use(require('../middleware/error.middleware'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = async (path, body, token, method) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/${path}`, {
      method: method || (body ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  assert.equal((await request('setup')).body.required, true);
  assert.equal((await request('sign-up', { name: 'Test', email: 'bad', password: '123' })).status, 400);
  const credentials = { name: 'Test admin', email: 'ADMIN@example.com', password: 'password-123' };
  const first = await request('sign-up', credentials);
  assert.equal(first.status, 201);
  assert.equal(first.body.data.role, 'superAdmin');
  assert.equal(first.body.data.password, undefined);
  assert.equal((await request('setup')).body.required, false);
  assert.equal((await request('sign-up', credentials)).status, 401);
  assert.equal((await request('sign-in', { ...credentials, password: 'wrong' })).status, 401);
  const login = await request('sign-in', credentials);
  assert.equal(login.status, 200);
  const token = login.body.token;
  assert.equal((await request('me', undefined, token)).body.data.id, first.body.data.id);
  assert.equal((await request('me', undefined, 'bad-token')).status, 401);
  const second = { name: 'Second', email: 'second@example.com', password: 'password-456' };
  assert.equal((await request('sign-up', second, token)).body.data.role, 'admin');
  assert.equal((await request('sign-up', second, token)).status, 409);
  const secondLogin = await request('sign-in', second);
  assert.equal((await request(`me`, { name: 'Updated' }, secondLogin.body.token, 'PATCH')).status, 200);
  assert.equal((await request('me', undefined, secondLogin.body.token)).body.data.name, 'Updated');
  assert.equal((await request('me', { role: 'superAdmin' }, secondLogin.body.token, 'PATCH')).status, 403);
  assert.equal((await request(first.body.data.id, undefined, token, 'DELETE')).status, 403);
  assert.equal((await Admin.findById(first.body.data.id)).isDeleted, false);
  assert.equal((await request(secondLogin.body.data.id, undefined, secondLogin.body.token, 'DELETE')).status, 403);
  assert.equal((await request('sign-up', { ...second, email: 'third@example.com' }, secondLogin.body.token)).status, 403);
  assert.equal((await request(secondLogin.body.data.id, undefined, token, 'DELETE')).status, 200);
  assert.equal((await request('me', undefined, secondLogin.body.token)).status, 401);
  await Admin.findByIdAndUpdate(first.body.data.id, { status: 'inactive' });
  assert.equal((await request('me', undefined, token)).status, 401);
  assert.equal((await request('sign-in', credentials)).status, 401);
});

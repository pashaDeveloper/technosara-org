const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const Admin = require('../models/admin.model');

test('dashboard routes use real account services and MongoDB', async t => {
  process.env.TOKEN_SECRET = 'isolated-dashboard-integration-secret';
  const database = `technosara_dashboard_test_${process.pid}_${Date.now()}`;
  await mongoose.connect('mongodb://127.0.0.1:27017', { dbName: database, serverSelectionTimeoutMS: 3000 });
  t.after(async () => {
    assert.equal(mongoose.connection.name, database);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  const app = express();
  app.use(express.json({ limit: '512kb' }), cookieParser());
  app.use('/api', require('../routes/admin.route'));
  app.use('/api/admin', require('../routes/admin.route'));
  app.use(require('../middleware/error.middleware'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const request = (path, body, cookie, method) => fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
    method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const credentials = { username: 'owner@example.com', password: 'password-123', confirmPassword: 'password-123' };
  assert.equal((await request('/account/register', { ...credentials, role: 'admin' })).status, 201);
  assert.equal((await request('/setup/2', credentials)).status, 409);
  const login = await request('/auth/password', credentials);
  assert.equal(login.status, 200);
  assert.deepEqual(await login.json(), { status: 'success' });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await (await request('/account/me', undefined, cookie)).json()).data.role, 'superAdmin');
  assert.equal((await (await request('/account/me', undefined, cookie)).json()).data.profileApproval.approvedLevel, 1);
  const profile = { name: 'Updated owner', phone: '09123456789', province: 'تهران', city: 'تهران', address: 'آدرس آزمایشی', plateNumber: '12', postalCode: '0123456789', nationalCode: '0123456789', identityNumber: '123', birthDate: '2000-02-29', bio: 'معرفی آزمایشی', avatarUrl: 'data:image/png;base64,iVBORw0KGgo=' };
  assert.equal((await request('/account/me', profile, undefined, 'PATCH')).status, 401);
  assert.equal((await request('/account/me', { role: 'admin' }, cookie, 'PATCH')).status, 400);
  assert.equal((await request('/account/me', { phone: 'bad' }, cookie, 'PATCH')).status, 400);
  assert.equal((await request('/account/me', { avatarUrl: 'javascript:alert(1)' }, cookie, 'PATCH')).status, 400);
  assert.equal((await request('/account/me', { avatarUrl: '' }, cookie, 'PATCH')).status, 400);
  for (const birthDate of ['2000-13-01', 'not-a-date']) {
    assert.equal((await request('/account/me', { birthDate }, cookie, 'PATCH')).status, 400);
  }
  assert.equal((await request('/account/me', { profileApproval: { approvedLevel: 3 } }, cookie, 'PATCH')).status, 400);
  assert.equal((await request('/account/verification', { level: 3 }, cookie)).status, 409);
  assert.equal((await request('/account/verification', { level: 2 }, cookie)).status, 400);
  assert.equal((await request('/account/me', profile, cookie, 'PATCH')).status, 403);
  const { province, city, address, plateNumber, postalCode, ...identity } = profile;
  assert.equal((await request('/account/me', identity, cookie, 'PATCH')).status, 200);
  assert.equal((await request('/account/me', { birthDate: '' }, cookie, 'PATCH')).status, 200);
  assert.equal((await request('/account/verification', { level: 2 }, cookie)).status, 400);
  assert.equal((await request('/account/me', { birthDate: identity.birthDate }, cookie, 'PATCH')).status, 200);
  const submitIdentity = await request('/account/verification', { level: 2 }, cookie);
  assert.equal(submitIdentity.status, 200);
  const pendingIdentity = (await submitIdentity.json()).data;
  assert.equal(pendingIdentity.profileApproval.approvedLevel, 1);
  assert.equal(pendingIdentity.profileApproval.pendingLevel, 2);
  assert.equal((await request('/account/verification', { level: 2 }, cookie)).status, 409);
  const approvalBody = { id: pendingIdentity.id, level: 2, version: pendingIdentity.profileVersion, decision: 'approve' };
  assert.equal((await request('/admin/verification', { ...approvalBody, version: approvalBody.version - 1 }, cookie, 'PATCH')).status, 409);
  assert.equal((await request('/admin/verification', { ...approvalBody, decision: 'reject' }, cookie, 'PATCH')).status, 400);
  assert.equal((await request('/admin/verification', { ...approvalBody, decision: 'reject', reason: 'شماره شناسنامه را بررسی کنید.' }, cookie, 'PATCH')).status, 200);
  const rejected = (await (await request('/account/me', undefined, cookie)).json()).data;
  assert.equal(rejected.profileApproval.approvedLevel, 1);
  assert.equal(rejected.profileApproval.pendingLevel, 0);
  assert.equal(rejected.profileApproval.rejectionReason, 'شماره شناسنامه را بررسی کنید.');
  const resubmitted = (await (await request('/account/verification', { level: 2 }, cookie)).json()).data;
  assert.equal((await request('/admin/verification', { ...approvalBody, version: resubmitted.profileVersion }, cookie, 'PATCH')).status, 200);
  assert.equal((await request('/admin/verification', { ...approvalBody, version: resubmitted.profileVersion }, cookie, 'PATCH')).status, 409);
  assert.equal((await request('/account/me', { province, city, address, plateNumber, postalCode }, cookie, 'PATCH')).status, 200);
  const pendingAddress = (await (await request('/account/verification', { level: 3 }, cookie)).json()).data;
  assert.equal(pendingAddress.profileApproval.approvedLevel, 2);
  assert.equal(pendingAddress.profileApproval.pendingLevel, 3);
  assert.equal((await request('/admin/verification', { id: pendingAddress.id, level: 3, version: pendingAddress.profileVersion, decision: 'approve' }, cookie, 'PATCH')).status, 200);
  const saved = (await (await request('/account/me', undefined, cookie)).json()).data;
  for (const [key, value] of Object.entries(profile)) assert.equal(key === 'avatarUrl' ? saved.avatar.url : saved[key], value);
  assert.equal(saved.password, undefined);
  assert.equal(saved.role, 'superAdmin');
  assert.equal(saved.profileApproval.approvedLevel, 3);
  const stored = await Admin.collection.findOne({ _id: new mongoose.Types.ObjectId(saved.id) });
  assert.deepEqual(stored.addressInfo, { province, city, address, plateNumber, postalCode });
  for (const key of ['province', 'city', 'address', 'plateNumber', 'postalCode']) assert.equal(stored[key], undefined);
  assert.ok(stored.birthDate instanceof Date);
  assert.equal(stored.birthDate.toISOString(), '2000-02-29T00:00:00.000Z');
  // Changing verified data invalidates approvals and stale review snapshots.
  assert.equal((await request('/account/me', { address: 'آدرس جدید' }, cookie, 'PATCH')).status, 200);
  assert.equal((await (await request('/account/me', undefined, cookie)).json()).data.profileApproval.approvedLevel, 2);
  const changedAddress = (await (await request('/account/verification', { level: 3 }, cookie)).json()).data;
  assert.equal((await request('/account/me', { birthDate: '2000-03-01' }, cookie, 'PATCH')).status, 200);
  assert.equal((await request('/admin/verification', { id: changedAddress.id, level: 3, version: changedAddress.profileVersion, decision: 'approve' }, cookie, 'PATCH')).status, 409);
  const resetApproval = (await (await request('/account/me', undefined, cookie)).json()).data.profileApproval;
  assert.equal(resetApproval.approvedLevel, 1);
  assert.equal(resetApproval.pendingLevel, 0);
  const avatarUrl = `http://127.0.0.1:${server.address().port}/avatar/female/51.png`;
  assert.equal((await request('/account/me', { avatarUrl }, cookie, 'PATCH')).status, 200);
  assert.equal((await (await request('/account/me', undefined, cookie)).json()).data.avatar.url, avatarUrl);
  assert.equal((await request('/account/me', { avatarUrl: 'https://foreign.example/avatar/male/1.png' }, cookie, 'PATCH')).status, 400);
  const passwordChange = { currentPassword: 'wrong', newPassword: 'new-password-456', confirmPassword: 'new-password-456' };
  assert.equal((await request('/account/me', passwordChange, cookie, 'PATCH')).status, 400);
  assert.equal((await request('/account/me', { ...passwordChange, currentPassword: credentials.password }, cookie, 'PATCH')).status, 200);
  assert.equal((await request('/auth/password', credentials)).status, 401);
  assert.equal((await request('/auth/password', { ...credentials, password: passwordChange.newPassword })).status, 200);
  const second = { ...credentials, username: 'second@example.com' };
  assert.equal((await request('/admin/users', second)).status, 401);
  assert.equal((await request('/account/register', { ...second, role: 'superAdmin', status: 'active' })).status, 201);
  const secondAdmin = await Admin.findOne({ email: second.username });
  assert.equal(secondAdmin.role, 'admin');
  assert.equal(secondAdmin.status, 'inactive');
  assert.equal((await request('/account/me', { email: second.username }, cookie, 'PATCH')).status, 409);
  assert.equal((await request('/account/register', second)).status, 409);
  assert.equal(await Admin.countDocuments({ role: 'superAdmin' }), 1);
  // Preserve the existing service's approval policy for newly registered admins.
  assert.equal((await request('/auth/password', second)).status, 401);
  await Admin.updateOne({ email: second.username }, { $set: { status: 'active' } });
  const secondLogin = await request('/auth/password', second);
  assert.equal(secondLogin.status, 200);
  const secondCookie = secondLogin.headers.get('set-cookie').split(';')[0];
  assert.equal((await (await request('/account/me', undefined, secondCookie)).json()).data.profileApproval.approvedLevel, 1);
  assert.equal((await request('/admin/verification', undefined, secondCookie)).status, 403);
  assert.equal((await request('/admin/verification', approvalBody, secondCookie, 'PATCH')).status, 403);
  assert.equal((await request('/account/verification', { level: 3 }, secondCookie)).status, 409);
  assert.equal((await request('/account/verification', { level: 2 })).status, 401);
  assert.equal((await request('/admin/verification', undefined, cookie)).status, 200);
  assert.equal((await request('/account/me', { phone: '09123456789', nationalCode: '0123456789', identityNumber: '123', birthDate: '2000-02-29' }, secondCookie, 'PATCH')).status, 200);
  const secondPending = (await (await request('/account/verification', { level: 2 }, secondCookie)).json()).data;
  const queue = (await (await request('/admin/verification', undefined, cookie)).json()).data;
  assert.equal(queue.find(account => account.id === secondPending.id).nationalCode, '0123456789');
  assert.equal((await request('/admin/verification', { id: secondPending.id, level: 2, version: secondPending.profileVersion, decision: 'approve' }, cookie, 'PATCH')).status, 200);
  // The legacy profile route must also invalidate identity approval on a name change.
  const legacyLogin = await request('/admin/sign-in', { email: second.username, password: second.password });
  const legacyToken = (await legacyLogin.json()).token;
  const legacyUpdate = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/me`, {
    method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${legacyToken}` },
    body: JSON.stringify({ name: 'Changed legal name' }),
  });
  assert.equal(legacyUpdate.status, 200);
  assert.equal((await (await request('/account/me', undefined, secondCookie)).json()).data.profileApproval.approvedLevel, 1);
  assert.equal((await request('/admin/users', { ...second, username: 'third@example.com' }, secondCookie)).status, 403);
  await Admin.updateOne({ email: credentials.username }, { $set: { status: 'inactive' } });
  assert.equal((await request('/account/me', undefined, cookie)).status, 401);
});

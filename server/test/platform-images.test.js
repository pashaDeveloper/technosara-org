const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Platform = require('../models/platform.model');
const service = require('../services/platform.service');
const storage = require('../utils/imageUpload');

test('platform create and edit persist independent thumbnail and logo without extra image fields', async t => {
  let saved, patched, committed = false;
  t.mock.method(Platform.prototype, 'save', async function () { await this.validate(); saved = this; return this; });
  t.mock.method(Platform, 'findByIdAndUpdate', async (id, values) => { patched = values; return saved; });
  const body = { name: 'Test Platform', thumbnail: 'https://example.com/photo.webp', logo: 'https://example.com/logo.webp' };
  const res = { status() { return this; }, json() {} };
  const req = { body, admin: { _id: new mongoose.Types.ObjectId() }, commitUploads() { committed = true; }, uploadedImageValues: { preview: 'https://example.com/preview.webp', preview_url: 'ignored', image_storage: {} } };
  await service.addPlatform(req, res);
  assert.equal(saved.thumbnail, body.thumbnail);
  assert.equal(saved.logo, body.logo);
  assert.equal(saved.preview, req.uploadedImageValues.preview);
  assert.equal(saved.slug, 'test-platform');
  assert.equal(committed, true);
  for (const field of ['preview_url', 'image_storage', 'icon']) assert.equal(Platform.schema.path(field), undefined);
  await service.updatePlatform({ ...req, params: { id: String(saved._id) } }, res);
  assert.equal(patched.thumbnail, body.thumbnail);
  assert.equal(patched.logo, body.logo);
  assert.equal(patched.preview, req.uploadedImageValues.preview);
  assert.equal(patched.slug, 'test-platform');
  assert.equal(Object.hasOwn(patched, 'image_storage'), false);
  await service.updatePlatform({ ...req, body: { thumbnail: null }, params: { id: String(saved._id) } }, res);
  assert.equal(patched.preview, null);
  await service.updatePlatform({ ...req, uploadedImageValues: {}, body: { website_url: 'https://example.com' }, params: { id: String(saved._id) } }, res);
  assert.equal(patched.preview, undefined);
});

test('platform logo upload can send one file without an additional preview asset', async () => {
  const calls = [];
  const copies = await storage.uploadPair('platform/test', Buffer.from('image'), undefined, { arvan: {
    async put(key) { calls.push(key); return { key, url: `https://example.com/${key}` }; },
  } }, 'arvan');
  assert.equal(calls.length, 1);
  assert.ok(copies.arvan.image);
  assert.equal(copies.arvan.preview, undefined);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const sharp = require('sharp');
const { Writable } = require('stream');
const settings = require('../services/uploadSettings.service');
const storage = require('../utils/imageUpload');

async function serve(t, app) {
  app.use(require('../middleware/error.middleware'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return `http://127.0.0.1:${server.address().port}`;
}
test('global settings reject invalid values and bound processing dimensions and previews', async () => {
  for (const values of [{ quality: 0 }, { blur: 21 }, { previewSize: '64' }, { bad: 1 }, []]) assert.throws(() => settings.validate(values), { status: 400 });
  const input = await sharp({ create: { width: 600, height: 400, channels: 3, background: '#538acd' } }).png().toBuffer();
  const result = await require('../utils/compressImage')(input, settings.validate({ maxDimension: 320, previewSize: 32, quality: 30, previewQuality: 15, blur: 4 }));
  const full = await sharp(result.full).metadata(), preview = await sharp(result.preview).metadata();
  assert.equal(full.format, 'webp'); assert.equal(full.width, 320); assert.equal(preview.width, 32); assert.equal(preview.height, 32);
  await assert.rejects(require('../utils/compressImage')(Buffer.from('fake image'), settings.defaults), { status: 400 });
});

test('game uploads use role and game folders and global preview settings; invalid title rolls back', async t => {
  const values = settings.validate({ previewSize: 32, blur: 3 });
  t.mock.method(settings, 'read', async () => values);
  const files = new Map();
  t.mock.method(storage, 'createClients', () => ({ cloudinary: {
    async put(key, body) { files.set(key, body); return { key, url: `https://example.com/${key}` }; },
    async remove(key) { files.delete(key); },
  } }));
  const app = express();
  app.post('/', storage('games', 'cloudinary').single('screenshot'), (req, res) => { req.commitUploads(); res.json(req.uploadedFiles.screenshot[0]); });
  app.post('/card', storage('games', 'cloudinary').single('thumbnail'), (req, res) => { req.commitUploads(); res.json(req.uploadedFiles.thumbnail[0]); });
  const base = await serve(t, app);
  const input = await sharp({ create: { width: 300, height: 200, channels: 3, background: '#f36' } }).png().toBuffer();
  const form = title => { const form = new FormData(); if (title) form.append('gameTitle', title); form.append('screenshot', new Blob([input]), 'screen.png'); return form; };
  const response = await fetch(base, { method: 'POST', body: form('Test Game') });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.match(data.key, /^game\/test-game\/screenshot\//);
  assert.match(data.key, /\/screenshot-[\w-]+\.webp$/);
  assert.equal(data.blur.width, 300); assert.equal(data.blur.height, 200); assert.equal(data.blur.amount, 3);
  assert.equal((await sharp(files.get(data.copies.cloudinary.preview.key)).metadata()).width, 300);
  assert.equal(files.size, 2);
  const card = new FormData(); card.append('gameTitle', 'Test Game'); card.append('platformId', 'platform-test'); card.append('quality', 'high_quality'); card.append('thumbnail', new Blob([input]), 'card.png');
  const cardResponse = await fetch(base + '/card', { method: 'POST', body: card });
  assert.equal(cardResponse.status, 200);
  const cardData = await cardResponse.json();
  assert.match(cardData.key, /^game\/test-game\/card-[\w-]+\.webp$/);
  assert.ok(!cardData.key.includes('platform-')); assert.ok(!cardData.key.includes('quality'));
  assert.equal((await fetch(base, { method: 'POST', body: form('') })).status, 400);
  assert.equal(files.size, 4);
});

test('video upload compresses the stored asset, generates a preview, and registers cleanup', async t => {
  const cloudinary = require('cloudinary').v2;
  for (const key of ['CLOUD_NAME', 'API_KEY', 'API_SECRET']) { const previous = process.env[key]; process.env[key] = 'test'; t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; }); }
  let options, removed;
  t.mock.method(cloudinary.uploader, 'upload_stream', (values, callback) => {
    options = values;
    return new Writable({ write(chunk, encoding, done) { done(); }, final(done) { callback(null, { public_id: values.public_id, secure_url: 'https://example.com/video.mp4', bytes: 80, width: 320, height: 200, eager: [{ secure_url: 'https://example.com/preview.jpg' }] }); done(); } });
  });
  t.mock.method(cloudinary.uploader, 'destroy', async (key, values) => { removed = { key, ...values }; return { result: 'ok' }; });
  const cleanup = [];
  const file = await storage.uploadVideo({ mimetype: 'video/mp4', buffer: Buffer.alloc(100) }, 'My Game', 'trailer', settings.defaults, job => cleanup.push(job));
  assert.match(options.public_id, /^game\/my-game\/trailer-/);
  assert.equal(options.resource_type, 'video'); assert.equal(options.transformation[0].quality, settings.defaults.videoQuality);
  assert.equal(options.transformation[0].fetch_format, 'mp4'); assert.equal(options.eager[0].width, settings.defaults.previewSize);
  assert.equal(file.resource_type, 'video'); assert.equal(file.blur.url, 'https://example.com/preview.jpg');
  await cleanup[0](); assert.equal(removed.resource_type, 'video'); assert.equal(removed.key, file.key);
  await assert.rejects(storage.uploadVideo({ mimetype: 'text/plain' }, 'Test', 'video', settings.defaults, () => {}), { status: 400 });
});

test('settings API persists global values, previews without uploading, and enforces admin access', async t => {
  const jwt = require('jsonwebtoken');
  const Model = require('mongoose').model('UploadSettings');
  let saved;
  t.mock.method(Model, 'findById', () => ({ lean: async () => saved ? { values: saved } : null }));
  t.mock.method(Model, 'findByIdAndUpdate', async (id, update) => { assert.equal(id, 'global'); saved = update.values; });
  const previous = process.env.TOKEN_SECRET; process.env.TOKEN_SECRET = 'test-upload-settings-secret';
  t.after(() => { if (previous === undefined) delete process.env.TOKEN_SECRET; else process.env.TOKEN_SECRET = previous; });
  const auth = role => ({ authorization: 'Bearer ' + jwt.sign({ role }, process.env.TOKEN_SECRET) });
  const app = express(); app.use(express.json()); app.use('/', require('../routes/uploadSettings.route'));
  const base = await serve(t, app);
  assert.equal((await fetch(base)).status, 401);
  assert.equal((await fetch(base, { headers: auth('user') })).status, 403);
  const headers = { ...auth('admin'), 'Content-Type': 'application/json' };
  assert.equal((await fetch(base, { method: 'PATCH', headers, body: JSON.stringify({ quality: 101 }) })).status, 400);
  const values = settings.validate({ quality: 45, previewSize: 32, blur: 6 });
  assert.equal((await fetch(base, { method: 'PATCH', headers, body: JSON.stringify(values) })).status, 200);
  assert.deepEqual((await (await fetch(base, { headers: auth('admin') })).json()).data, values);
  const input = await sharp({ create: { width: 400, height: 200, channels: 3, background: '#7384ab' } }).png().toBuffer();
  const form = new FormData(); form.append('image', new Blob([input]), 'sample.png'); form.append('settings', JSON.stringify(values));
  const response = await fetch(base + '/preview', { method: 'POST', headers: auth('admin'), body: form });
  assert.equal(response.status, 200);
  const result = (await response.json()).data;
  assert.match(result.image, /^data:image\/webp;base64,/); assert.equal(result.originalBytes, input.length);
  assert.equal((await sharp(Buffer.from(result.preview.split(',')[1], 'base64')).metadata()).width, 32);
});

test('game previews retain the stored image dimensions for portrait and landscape uploads', async () => {
  for (const [width, height] of [[600, 900], [1200, 500]]) {
    const input = await sharp({create:{width,height,channels:3,background:'#538acd'}}).png().toBuffer();
    const result = await require('../utils/compressImage')(input, settings.validate({maxDimension:640,previewSize:32}), false, true);
    const full = await sharp(result.full).metadata(), low = await sharp(result.preview).metadata();
    assert.equal(low.width, full.width); assert.equal(low.height, full.height);
    assert.notEqual(low.width, low.height);
  }
});

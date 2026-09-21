const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs/promises');
const { files } = require('./mock-catalog-storage.cjs');
sharp.cache(false);

test('all four catalog models store full images and 64px previews in named folders', async t => {
  const database = `catalog_images_test_${process.pid}_${Date.now()}`;
  await mongoose.connect('mongodb://127.0.0.1:27017', { dbName: database, serverSelectionTimeoutMS: 3000 });
  const folders = [];
  t.after(async () => {
    assert.equal(mongoose.connection.name, database);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    const root = path.resolve(__dirname, '../uploads');
    for (const folder of folders) {
      assert.ok(folder.startsWith(root + path.sep));
      try {
        await fs.rm(folder, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
      } catch (error) {
        if (!['EPERM', 'EBUSY', 'ENOTEMPTY'].includes(error.code)) throw error;
        t.diagnostic(`Windows retained temporary image files: ${folder}`);
      }
    }
  });
  const data = 'data:image/png;base64,' + (await sharp({ create: { width: 400, height: 200, channels: 3, background: '#4488cc' } }).png().toBuffer()).toString('base64');
  for (const [model, field, extra] of [['genre', 'image', {}], ['platform', 'logo', { code: 'test', device_type: 'console' }], ['company', 'logo', { type: 'developer' }], ['person', 'photo', {}]]) {
    const Model = require(`../models/${model}.model`);
    const upload = require('../middleware/catalogUpload.middleware')({ provider: 'both', folder: model, field, Model });
    const prepare = async (body, id) => {
      const req = { body, params: id ? { id } : {} };
      await new Promise((resolve, reject) => upload(req, {}, error => error ? reject(error) : resolve()));
      return { ...req.body, ...req.catalogImageValues };
    };
    const record = await Model.create(await prepare({ name: 'Test', english_name: 'Test', slug: 'test-image', [field]: data, ...extra }));
    assert.match(record[field], new RegExp(`/${model}/test-image/[a-f0-9-]+-image\\.webp$`));
    for (const provider of ['arvan', 'cloudinary']) {
      const copies = record.image_storage[provider];
      assert.equal((await sharp(files.get(`${provider}/${copies.image.key}`)).metadata()).width, 400);
      const metadata = await sharp(files.get(`${provider}/${copies.preview.key}`)).metadata();
      assert.equal(metadata.width, 64);
      assert.equal(metadata.height, 64);
    }
    const updated = await Model.findByIdAndUpdate(record._id, await prepare({ [field]: data }, record._id), { new: true, runValidators: true });
    assert.notEqual(updated[field], record[field]);
    assert.match(updated.preview_url, /preview-64.webp$/);
    const loaded = await Model.findById(record._id);
    loaded.name = 'Renamed';
    await loaded.save();
    assert.equal(loaded[field], updated[field]);
    await assert.rejects(prepare({ name: 'Invalid', slug: 'invalid-image', [field]: 'data:image/png;base64,YQ==', ...extra }));
  }
});

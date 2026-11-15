const { test } = require('node:test');
const assert = require('node:assert/strict');
const { uploadPair } = require('../utils/imageUpload');
const storage = require('../utils/imageUpload');

test('replacement deletes both old variants on both providers and retains current keys', async t => {
  const removed = [];
  let attempts = 0;
  t.mock.method(storage, 'createClients', provider => ({ [provider]: {
    async remove(key) {
      if (provider === 'arvan' && key === 'old' && attempts++ === 0) throw Error('temporary');
      removed.push(provider + ':' + key);
    },
  } }));
  await storage.removeReplacedCopies({
    arvan: { image: { key: 'old' }, preview: { key: 'old-preview' } },
    cloudinary: { image: { key: 'old' }, preview: { key: 'retained' } },
  }, { cloudinary: { image: { key: 'new' }, preview: { key: 'retained' } } });
  assert.deepEqual(removed.sort(), ['arvan:old', 'arvan:old-preview', 'cloudinary:old']);
});

test('cleanup failure keeps committed uploads and marks the response', async t => {
  let committed = false;
  const headers = {};
  t.mock.method(console, 'error', () => {});
  t.mock.method(storage, 'removeReplacedCopies', async () => {
    assert.equal(committed, true);
    throw Error('storage unavailable');
  });
  await storage.finishImageReplacement({ commitUploads() { committed = true; }, uploadedImageValues: { image_storage: {} } },
    { setHeader(key, value) { headers[key] = value; } }, {});
  assert.equal(headers['X-Image-Cleanup-Pending'], 'true');
});
test('access denied identifies only the failed provider without exposing upstream details', async () => {
  const client = {
    async put() { throw Object.assign(new Error('private upstream detail'), { name: 'AccessDenied' }); },
    async remove() {},
  };
  await assert.rejects(uploadPair('brand/test', Buffer.from('a'), Buffer.from('b'), { arvan: client }, 'arvan'), error => {
    assert.equal(error.status, 502);
    assert.match(error.message, /ابر آروان.*403/);
    assert.doesNotMatch(error.message, /Cloudinary|هر دو|private upstream detail/);
    return true;
  });
});
for (const selection of ['arvan', 'cloudinary']) {
  test(`selecting ${selection} never calls the other provider`, async () => {
    const calls = [];
    const clients = Object.fromEntries(['arvan', 'cloudinary'].map(provider => [provider, {
      async put(key) { calls.push(provider); return { key, url: `https://${provider}.example.com/${key}` }; },
    }]));
    const copies = await uploadPair('genre/action', Buffer.from('a'), Buffer.from('b'), clients, selection);
    assert.deepEqual(calls, [selection, selection]);
    assert.deepEqual(Object.keys(copies), [selection]);
  });
}
test('failure rolls back all variants including late successes', async () => {
  const remaining = new Set();
  const clients = Object.fromEntries(['arvan', 'cloudinary'].map(provider => [provider, {
    async put(key) {
      if (provider === 'cloudinary' && !key.endsWith('preview-64.webp')) throw Error('unavailable');
      await new Promise(resolve => setTimeout(resolve, 20));
      remaining.add(provider + key);
      return { key, url: 'https://example.com/' + key };
    },
    async remove(key) { remaining.delete(provider + key); },
  }]));
  await assert.rejects(uploadPair('genres/action/unique-version', Buffer.from('a'), Buffer.from('b'), clients), { status: 502 });
  assert.equal(remaining.size, 0);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { uploadPair } = require('../utils/imageUpload');
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

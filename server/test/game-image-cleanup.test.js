const { test } = require('node:test');
const assert = require('node:assert/strict');
const storage = require('../utils/imageUpload');
const service = require('../services/gameImageCleanup.service');
test('replacement removes old image and preview, retaining images used in other fields', async t => {
  const old = process.env.CLOUD_NAME; process.env.CLOUD_NAME = 'test';
  t.after(() => { if (old === undefined) delete process.env.CLOUD_NAME; else process.env.CLOUD_NAME = old; });
  const removed = [];
  t.mock.method(storage, 'createClients', () => ({ cloudinary: { async remove(key) { removed.push(key); } } }));
  const url = name => `https://res.cloudinary.com/test/image/upload/v123/game/test/card/${name}.webp`;
  await service.cleanup({ image: url('old'), detail_banner: url('retained'), screenshots: [url('shot')] }, { image: url('new'), detail_poster: url('retained'), screenshots: [] });
  assert.deepEqual(removed.sort(), ['game/test/card/old', 'game/test/card/old-preview-64', 'game/test/card/shot', 'game/test/card/shot-preview-64']);
  for (const value of ['https://res.cloudinary.com/other/image/upload/game/test/a.webp', 'https://example.com/a.webp', 'https://res.cloudinary.com/test/image/upload/admin/a.webp']) assert.equal(service.keyFromUrl(value), null);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const search = require('../services/playstationSearch');

test('Chihiro encodes search terms and preserves distinct Sony editions and IDs', async () => {
  const rows = await search('Ghost / 日本?', async url => {
    assert.equal(decodeURIComponent(url.pathname.split('/').at(-1)), 'Ghost / 日本?');
    assert.equal(url.searchParams.get('size'), '8');
    assert.equal(url.searchParams.get('suggested_size'), '0');
    return { links: [
      { id: 'UP9000-CUSA12345_00-GAME', name: 'Ghost', images: [{ url: 'http://bad' }, { url: 'https://example.com/cover.png' }], metadata: { playable_platform: { values: ['PS4'] } } },
      { id: 'UP9000-PPSA12345_00-DELUXE', name: 'Ghost Deluxe', playable_platform: ['PS5'] },
      { id: 'UP9000-CUSA12345_00-GAME', name: 'Duplicate' },
      { id: '../bad', name: 'Invalid' }, null,
    ] };
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].provider, 'playstation');
  assert.equal(rows[0].id, 'UP9000-CUSA12345_00-GAME');
  assert.equal(rows[0].image, 'https://example.com/cover.png');
  assert.deepEqual(rows[0].platforms, ['PS4']);
  assert.deepEqual(rows[1].platforms, ['PS5']);
  assert.equal(rows[1].market, 'US');
});

test('Chihiro distinguishes empty results from malformed responses and request failures', async () => {
  assert.deepEqual(await search('Missing', async () => ({ links: [] })), []);
  await assert.rejects(search('Ghost', async () => ({})), /Invalid PlayStation/);
  await assert.rejects(search('Ghost', async () => { throw new Error('Provider HTTP 403'); }), /403/);
});

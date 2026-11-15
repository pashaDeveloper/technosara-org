const { test } = require('node:test');
const assert = require('node:assert/strict');
const search = require('../services/rawgSearch');

test('RAWG alternative selects PlayStation family and keeps its own source IDs', async t => {
  const previous = process.env.RAWG_API_KEY;
  process.env.RAWG_API_KEY = 'test-key';
  t.after(() => { if (previous === undefined) delete process.env.RAWG_API_KEY; else process.env.RAWG_API_KEY = previous; });
  const requests = [];
  const rows = await search('Ghost', async url => {
    requests.push(url);
    if (url.pathname.endsWith('/parents')) return { results: [{ id: 22, slug: 'playstation' }] };
    return { results: [
      { id: 123, slug: 'ghost-game', name: 'Ghost Game', platforms: [{ platform: { slug: 'playstation5', name: 'PlayStation 5' } }] },
      { id: 456, name: 'PC game', platforms: [{ platform: { slug: 'pc', name: 'PC' } }] },
    ] };
  });
  assert.equal(requests[1].searchParams.get('parent_platforms'), '22');
  assert.equal(requests[1].searchParams.get('search'), 'Ghost');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].provider, 'rawg');
  assert.equal(rows[0].id, '123');
  assert.deepEqual(rows[0].platforms, ['PlayStation 5']);
});

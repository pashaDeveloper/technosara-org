const { test } = require('node:test');
const assert = require('node:assert/strict');
const { search } = require('../services/psrayTrophySearch.service');
const api = require('../services/psnTrophies.service');

test('search returns supported trophy suggestions without credentials or automatic binding', async () => {
  const fetcher = async (url, options) => {
    assert.equal(new URL(url).hostname, 'api.psray.net');
    assert.equal(new URL(url).searchParams.get('q'), 'Mafia');
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.headers.Cookie, undefined);
    return Response.json({ data: [
      { name: 'Mafia', np_communication_id: 'NPWR38792_00', platform: ['PS5'] },
      { name: 'Old', np_communication_id: 'NPWR12345_00', platform: ['PS3'] },
      { name: 'Invalid', np_communication_id: 'invalid', platform: ['PS4'] }
    ] });
  };
  const rows = await search(' Mafia ', fetcher);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].requires_confirmation, true);
  assert.deepEqual(rows[0].platforms, ['ps5']);
  assert.deepEqual(await api.candidates({ title: 'Mafia' }, fetcher), rows);
  await assert.rejects(api.preview({ title: 'Mafia', ...rows[0], platform: 'ps5' }, fetcher), { status: 409 });
});

test('search tolerates unavailable or malformed responses', async () => {
  assert.deepEqual(await search('Game', async () => new Response('', { status: 429 })), []);
  assert.deepEqual(await search('Game', async () => new Response('invalid JSON')), []);
  assert.deepEqual(await search('Game', async () => { throw new Error('Offline'); }), []);
  assert.deepEqual(await search('', async () => { assert.fail('must not fetch'); }), []);
});

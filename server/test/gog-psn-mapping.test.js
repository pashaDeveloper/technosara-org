const { test } = require('node:test');
const assert = require('node:assert/strict');
const { lookup } = require('../services/gogPsnMapping.service');
const titleId = 'CUSA07408_00';
function data(npwrs = ['NPWR12518_00']) {
  return { external_id: titleId, platform_id: 'psn', game_id: '123', game: { id: '123', title: { 'en-US': 'God of War' }, releases: [titleId, ...npwrs].map(external_id => ({ platform_id: 'psn', external_id })) } };
}
test('maps exact store release identity without sending PSN credentials', async () => {
  const sets = await lookup(titleId, async (url, options) => {
    assert.equal(url, 'https://gamesdb.gog.com/platforms/psn/external_releases/' + titleId);
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.headers.Cookie, undefined);
    return new Response(JSON.stringify(data()));
  });
  assert.equal(sets[0].npCommunicationId, 'NPWR12518_00');
  assert.equal(sets[0].mappingSource, 'gog-gamesdb');
});
test('refuses ambiguous, absent, mismatched and unavailable mappings', async () => {
  for (const value of [data([]), data(['NPWR12518_00', 'NPWR99999_00']), { ...data(), external_id: 'PPSA12345_00' }, { ...data(), platform_id: 'steam' }]) assert.deepEqual(await lookup(titleId, async () => new Response(JSON.stringify(value))), []);
  assert.deepEqual(await lookup(titleId, async () => new Response('{}', { status: 429 })), []);
  assert.deepEqual(await lookup(titleId, async () => { throw new Error('Offline'); }), []);
});

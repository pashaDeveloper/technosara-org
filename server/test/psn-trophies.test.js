const { test } = require('node:test');
const assert = require('node:assert/strict');
const api = require('../services/psnTrophies.service');
const mongoose = require('mongoose');
const Achievement = require('../models/achievement.model');
const source = { official_stores: [{ url: 'https://store.playstation.com/en-us/product/UP0001-PPSA12345_00-EXAMPLE0000000000' }] };
const one = { bronze: 1, silver: 0, gold: 0, platinum: 0 };
function fixture(t, mode) {
  const before = process.env.PSN_NPSSO;
  process.env.PSN_NPSSO = 'test-' + Math.random();
  t.after(() => { if (before == null) delete process.env.PSN_NPSSO; else process.env.PSN_NPSSO = before; });
  return async (url, options) => {
    assert.ok(!url.includes(process.env.PSN_NPSSO));
    if (url.startsWith('https://gamesdb.gog.com/')) return new Response('{}', { status: 404 });
    if (url.includes('/authorize?')) return new Response(null, { status: 302, headers: { location: mode === 'bad-auth' ? 'https://example.com/?error=login_required' : 'com.scee.psxandroid.scecompcall://redirect?code=test-code' } });
    if (url.endsWith('/token')) return new Response(JSON.stringify({ access_token: 'test-access', expires_in: 3600 }));
    assert.equal(options.headers.Authorization, 'Bearer test-access');
    if (url.includes('/titles/trophyTitles')) return new Response(JSON.stringify({ titles: [{ npTitleId: 'PPSA12345_00', trophyTitles: mode === 'no-map' ? [] : [{ npCommunicationId: 'NPWR12345_00', trophyTitleName: 'Example' }] }] }));
    if (url.includes('/trophyGroups?')) return new Response(JSON.stringify({ trophyTitleName: 'Example', trophyTitlePlatform: 'PS5', definedTrophies: { ...one, bronze: 2 }, trophyGroups: ['default', '001'].map(trophyGroupId => ({ trophyGroupId, trophyGroupName: trophyGroupId, definedTrophies: one })) }));
    const second = url.includes('/001/');
    return new Response(JSON.stringify({ totalItemCount: mode === 'truncated' ? 2 : 1, trophies: [{ trophyId: second && mode !== 'duplicate' ? 1 : 0, trophyName: 'First', trophyType: 'bronze', trophyHidden: true }] }));
  };
}
test('maps exact store title IDs and reads all trophy groups', async t => {
  const fetcher = fixture(t);
  const choices = await api.candidates(source, fetcher);
  assert.equal(choices[0].product_id, 'PPSA12345_00');
  const result = await api.preview({ ...source, ...choices[0], platform: 'ps5' }, fetcher);
  assert.equal(result.total, 2);
  assert.equal(result.groups[0].group_type, 'base_game');
  assert.equal(result.groups[1].group_type, 'update');
  assert.equal(result.trophies[0].external_id, '0');
  assert.equal(result.trophies[1].is_dlc, true);
  for (const row of result.trophies) await new Achievement({ ...row, game_id: new mongoose.Types.ObjectId(), platform_id: new mongoose.Types.ObjectId(), achievement_group_id: new mongoose.Types.ObjectId() }).validate();
});
test('rejects missing mappings, wrong selections, invalid auth and incomplete lists', async t => {
  await assert.rejects(api.candidates(source, fixture(t, 'no-map')), { status: 409 });
  await assert.rejects(api.candidates(source, fixture(t, 'bad-auth')), { status: 401 });
  await assert.rejects(api.preview({ ...source, ppid: 'NPWR99999_00', product_id: 'PPSA12345_00', platform: 'ps5' }, fixture(t)), { status: 409 });
  for (const mode of ['truncated', 'duplicate']) await assert.rejects(api.readSet({ ppid: 'NPWR12345_00' }, 'ps5', fixture(t, mode)), { status: 502 });
});
test('resolves official PlayStation game pages without including comic add-ons', async () => {
  const input = { official_stores: [{ url: 'https://www.playstation.com/en-us/games/god-of-war/' }] };
  const fetcher = async url => {
    assert.equal(url, input.official_stores[0].url);
    return new Response('<script type="application/json">' + JSON.stringify({ cache: {
      base: { __typename: 'Product', type: 'GAME', id: 'UP9000-CUSA07408_00-00000000GODOFWAR' },
      deluxe: { __typename: 'Product', type: 'GAME', id: 'UP9000-CUSA07408_00-GODOFWARDDE00000' },
      comic: { __typename: 'Product', type: 'ADD_ON', id: 'UP9000-CUSA14642_00-GOWCOMICBOOK0001' }
    } }) + '</script>');
  };
  assert.deepEqual([...(await api.titleIds(input, fetcher)).keys()], ['CUSA07408_00']);
  for (const url of ['https://www.playstation.com.evil.test/en-us/games/god-of-war/', 'https://user:pass@www.playstation.com/en-us/games/god-of-war/']) {
    await assert.rejects(api.titleIds({ official_stores: [{ url }] }, async () => { throw new Error('Must not fetch'); }), { status: 400 });
  }
});
test('uses exact title mapping from a public reference profile without importing its progress', async t => {
  const before = process.env.PSN_TROPHY_LOOKUP_ACCOUNT_IDS;
  process.env.PSN_TROPHY_LOOKUP_ACCOUNT_IDS = '98765';
  t.after(() => { if (before == null) delete process.env.PSN_TROPHY_LOOKUP_ACCOUNT_IDS; else process.env.PSN_TROPHY_LOOKUP_ACCOUNT_IDS = before; });
  const base = fixture(t);
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push(url);
    if (url.includes('/users/me/titles/')) return new Response(JSON.stringify({ titles: [{ npTitleId: 'PPSA12345_00', trophyTitles: [] }] }));
    if (url.includes('/users/98765/titles/')) return new Response(JSON.stringify({ titles: [{ npTitleId: 'PPSA12345_00', trophyTitles: [{ npCommunicationId: 'NPWR12345_00', trophyTitleName: 'Example', progress: 100, earnedTrophies: one }] }] }));
    return base(url, options);
  };
  const choices = await api.candidates(source, fetcher);
  assert.equal(choices[0].ppid, 'NPWR12345_00');
  assert.equal(choices[0].progress, undefined);
  const preview = await api.preview({ ...source, ...choices[0], platform: 'ps5' }, fetcher);
  assert.equal(preview.total, 2);
  assert.equal(preview.account_progress, undefined);
  assert.ok(calls.some(url => url.includes('/users/98765/titles/')));
});
test('manual NPWR preview bypasses store and profile matching but verifies platform and counts', async t => {
  const base = fixture(t);
  const fetcher = async (url, options) => {
    assert.ok(!url.includes('gamesdb.gog.com') && !url.includes('/titles/trophyTitles'));
    return base(url, options);
  };
  const data = await api.preview({ manual: true, ppid: 'npwr-12345', platform: 'ps5' }, fetcher);
  assert.equal(data.ppid, 'NPWR12345_00');
  assert.equal(data.manual, true);
  assert.equal(data.total, 2);
  await assert.rejects(api.preview({ manual: true, ppid: 'https://example.com', platform: 'ps5' }, fetcher), { status: 400 });
  await assert.rejects(api.preview({ manual: true, ppid: 'NPWR12345_00', platform: 'ps4' }, fetcher), { status: 502 });
});
test('saved manual sets can be discovered again without a store link', async t => {
  const Group = require('../models/achievementGroup.model');
  t.mock.method(Group, 'find', query => {
    assert.equal(query.mapping_method, 'manual');
    return { lean: async () => [{ external_set_id: 'NPWR12345_00:ps5', name: 'Example' }, { external_set_id: 'NPWR12345_00:ps5', name: 'Additional group' }] };
  });
  const result = await api.candidates({ game_id: new mongoose.Types.ObjectId().toString() }, async () => { throw new Error('No request expected'); });
  assert.equal(result.length, 1);
  assert.equal(result[0].manual, true);
});
test('manual title IDs resolve through the mapping API and reject wrong platforms', async t => {
  const fetcher = fixture(t);
  const data = await api.preview({ manual: true, ppid: 'ppsa-12345', platform: 'ps5' }, fetcher);
  assert.equal(data.ppid, 'NPWR12345_00');
  assert.equal(data.product_id, 'PPSA12345_00');
  assert.equal(data.manual, true);
  await assert.rejects(api.preview({ manual: true, ppid: 'CUSA-12345', platform: 'ps5' }, fetcher), { status: 400 });
  await assert.rejects(api.titleIds({ manual_title_id: '../not-a-title' }, fetcher), { status: 400 });
});
test('detects available platforms automatically and falls back from missing PS5 sets', async t => {
  const base = fixture(t);
  const ps5 = await api.preview({ manual: true, ppid: 'NPWR12345' }, base);
  assert.deepEqual(ps5.sets.map(set => set.platform), ['ps5']);
  const ps4Fetcher = async (url, options) => {
    if (url.includes('npServiceName=trophy2')) return new Response('{}', { status: 404 });
    const response = await base(url, options);
    if (!url.includes('/trophyGroups?')) return response;
    const data = await response.json();
    return new Response(JSON.stringify({ ...data, trophyTitlePlatform: 'PS4' }));
  };
  const ps4 = await api.preview({ manual: true, ppid: 'NPWR12345' }, ps4Fetcher);
  assert.deepEqual(ps4.sets.map(set => set.platform), ['ps4']);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { xboxCapabilities, steamCapabilities, sonyCapabilities, read } = require('../services/storeCapabilities.service');

test('Xbox uses explicit attributes and their platform scopes, not description text', () => {
  const result = xboxCapabilities({ Product: { Properties: { XboxConsoleGenOptimized: ['ConsoleGen8', 'ConsoleGen9'], Attributes: [
    { Name: 'CapabilityHDR', ApplicablePlatforms: ['Desktop', 'Xbox'] },
    { Name: 'Capability4k', ApplicablePlatforms: ['Xbox'] },
    { Name: '120fps', ApplicablePlatforms: ['Xbox'] },
    { Name: 'RayTracing', ApplicablePlatforms: ['Xbox'] },
    { Name: 'SinglePlayer' },
  ] }, LocalizedProperties: [{ ProductDescription: 'VR support' }] } });
  assert.deepEqual(result, { platforms: [
    { platform: 'pc', status: { hdr: true } },
    { platform: 'xbox_series_xs', status: { hdr: true, '4k': true, '120fps': true, ray_tracing: true } },
  ], capability_status: { single_player: true } });
  assert.deepEqual(xboxCapabilities({ Product: { Properties: {} } }).platforms, []);
});

test('Steam imports explicit VR and HDR categories without inventing 4K or 120fps', () => {
  assert.deepEqual(steamCapabilities({ categories: [{ description: 'VR Only' }, { description: 'HDR available' }, { description: 'Steam Cloud' }], detailed_description: '4K 120fps ray tracing' }), { platforms: [{ platform: 'pc', status: { vr: true, hdr: true } }], capability_status: { cloud_saves: true } });
  assert.deepEqual(steamCapabilities({ categories: [] }), { platforms: [], capability_status: {} });
});

test('Sony notices select the requested product and preserve PS4/PS5 scope', () => {
  const product = (id, notices) => ({ __typename: 'Product', id, compatibilityNoticesByPlatform: notices });
  const cache = {
    'Product:game': product('game', { PS5: [{ type: 'CAESAR_HEADSET', value: 'REQUIRED' }], PS4: [{ type: 'VR_HEADSET', value: 'NOT_SUPPORTED' }] }),
    'Product:other': product('other', { PS4: [{ type: 'VR_HEADSET', value: 'OPTIONAL' }] }),
    'Concept:123': { __typename: 'Concept', id: '123', defaultProduct: { __ref: 'Product:game' } },
  };
  const html = `<script type="application/json">${JSON.stringify({ cache })}</script>`;
  const expected = { platforms: [{ platform: 'ps5', status: { vr: true } }], capability_status: {} };
  assert.deepEqual(sonyCapabilities(html, 'https://store.playstation.com/en-us/product/game'), expected);
  assert.deepEqual(sonyCapabilities(html, 'https://store.playstation.com/en-us/concept/123'), expected);
});

test('one failed source does not erase evidence from another source', async () => {
  const calls = [];
  const result = await read({ providers: ['steam', 'xbox'], official_stores: [{ url: 'https://store.steampowered.com/app/546560/' }] }, async url => {
    calls.push(url);
    return new Response(JSON.stringify({ 546560: { success: true, data: { steam_appid: 546560, categories: [{ description: 'VR Only' }] } } }));
  });
  assert.equal(result.results[0].platforms[0].status.vr, true);
  assert.ok(result.results[1].error);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].startsWith('https://store.steampowered.com/api/appdetails?appids=546560'));
});

test('invalid links and sources cannot make arbitrary network requests', async () => {
  const fetcher = () => { throw new Error('must not fetch'); };
  const result = await read({ providers: ['xbox'], official_stores: [{ url: 'https://127.0.0.1/private' }] }, fetcher);
  assert.ok(result.results[0].error);
  await assert.rejects(read({ providers: ['unknown'] }, fetcher), { status: 400 });
});

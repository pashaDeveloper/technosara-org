const { test } = require('node:test');
const assert = require('node:assert/strict');
const { xboxStorage, steamStorage, read } = require('../services/gameStorage.service');
const { gamebrainValues } = require('../utils/gamebrainValues');
test('Xbox reads package sizes, keeps generations unspecified, and ignores media sizes and zero values', () => {
  const pkg = { PlatformDependencies: [{ PlatformName: 'Windows.Xbox' }], MaxDownloadSizeInBytes: 123000000000, MaxInstallSizeInBytes: 0 };
  const rows = xboxStorage({ Product: { LocalizedProperties: [{ Images: [{ FileSizeInBytes: 999 }] }], DisplaySkuAvailabilities: [{ Sku: { Properties: { Packages: [pkg, pkg, { ...pkg, PlatformDependencies: [{ PlatformName: 'Windows.Desktop' }] }] } } }] } });
  assert.deepEqual(rows, [{ platform: 'xbox', kind: 'download', bytes: 123000000000 }, { platform: 'pc', kind: 'download', bytes: 123000000000 }]);
});
test('Steam reports required space rather than download size and handles missing information', () => {
  assert.deepEqual(steamStorage({ pc_requirements: { minimum: '<strong>Storage:</strong> 110 GB available space' } }), [{ platform: 'pc', kind: 'required', bytes: 110000000000 }]);
  assert.deepEqual(steamStorage({ pc_requirements: { minimum: 'Memory: 8 GB RAM' } }), []);
});
test('Xbox follows only a primary base product and returns dated source evidence', async () => {
  const calls = [];
  const result = await read({ official_stores: [{ url: 'https://www.xbox.com/en-US/games/store/game/9NKX70BBCDRN' }] }, async url => {
    calls.push(url);
    return Response.json({ Product: { DisplaySkuAvailabilities: [{ Sku: { Properties: calls.length === 1 ? { BundledSkus: [{ BigId: '9NNX1VVR3KNQ', IsPrimary: true }, { BigId: '9AAAAAAAAAAA', IsPrimary: false }] } : { Packages: [{ PlatformDependencies: [{ PlatformName: 'Windows.Xbox' }], MaxDownloadSizeInBytes: 1000000000 }] } } }] } });
  });
  assert.equal(calls.length, 2);
  const row = result.results[0].rows[0];
  assert.equal(row.bytes, 1000000000);
  assert.ok(row.source_url.endsWith('9NNX1VVR3KNQ'));
  assert.ok(Number.isFinite(Date.parse(row.checked_at)));
});
test('untrusted URLs are never fetched and missing sources explain manual PlayStation entry', async () => {
  const result = await read({ url: 'https://evil.example/data' }, () => { throw Error('must not fetch'); });
  assert.deepEqual(result.results, []);
  assert.ok(result.message.includes('PlayStation'));
});
test('storage survives form JSON validation and rejects invalid values', () => {
  const row = { platform: 'ps5', platform_id: '507f1f77bcf86cd799439011', bytes: 80000000000, kind: 'install', provider: 'manual', source_url: 'https://store.playstation.com/en-us/product/test', checked_at: new Date().toISOString() };
  assert.equal(gamebrainValues({ storage_sizes: JSON.stringify([row]) }).storage_sizes[0].bytes, row.bytes);
  assert.deepEqual(gamebrainValues({ storage_sizes: [] }).storage_sizes, []);
  for (const patch of [{ bytes: -1 }, { bytes: 1.5 }, { kind: 'guess' }, { checked_at: 'invalid' }, { source_url: 'javascript:alert(1)' }]) assert.throws(() => gamebrainValues({ storage_sizes: [{ ...row, ...patch }] }), { status: 400 });
});

test('title-only Steam lookup selects the exact game and fetches its required space', async () => {
  const calls = [];
  const result = await read({ title: 'Forza Horizon 5', providers: ['steam'] }, async url => {
    calls.push(url);
    if (url.includes('storesearch')) return Response.json({ items: [{ id: 1, name: 'Forza Horizon 5 Deluxe' }, { id: 1551360, name: 'Forza Horizon 5' }] });
    assert.ok(url.includes('appids=1551360'));
    return Response.json({ 1551360: { success: true, data: { steam_appid: 1551360, pc_requirements: { minimum: 'Storage: 110 GB available space' } } } });
  });
  assert.equal(calls.length, 2);
  assert.equal(result.results[0].rows[0].bytes, 110000000000);
});

test('title-only Xbox lookup does not confuse editions or fetch Steam', async () => {
  const result = await read({ title: 'Game', providers: ['xbox'] }, async url => {
    if (url.includes('productFamilies')) return Response.json({ Products: [{ ProductId: '9AAAAAAAAAAA', LocalizedProperties: [{ ProductTitle: 'Game Deluxe' }] }, { ProductId: '9BBBBBBBBBBB', LocalizedProperties: [{ ProductTitle: 'Game' }] }] });
    assert.ok(url.includes('/9BBBBBBBBBBB?'));
    return Response.json({ Product: { DisplaySkuAvailabilities: [{ Sku: { Properties: { Packages: [{ PlatformDependencies: [{ PlatformName: 'Windows.Xbox' }], MaxDownloadSizeInBytes: 2000000000 }] } } }] } });
  });
  assert.equal(result.results[0].rows[0].bytes, 2000000000);
});

test('ambiguous titles return an explanation instead of choosing another edition', async () => {
  const result = await read({ title: 'Game', providers: ['steam'] }, async url => {
    assert.ok(url.includes('storesearch'));
    return Response.json({ items: [{ id: 1, name: 'Game' }, { id: 2, name: 'Game' }] });
  });
  assert.equal(result.results[0].rows.length, 0);
  assert.match(result.results[0].error, /چند نسخه/);
});

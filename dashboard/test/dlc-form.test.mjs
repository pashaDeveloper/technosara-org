import { test } from 'node:test';
import assert from 'node:assert/strict';
import { steamFormLinks, runDlcBatch, consoleFormSource, dlcKey } from '../src/pages/games/dlcFormUtils.js';

test('console discovery uses title and console links, ignoring unavailable Steam products', () => {
  const result = consoleFormSource(' Grand Theft Auto V ', [{ url: 'https://store.steampowered.com/app/379480' }, { url: 'https://www.xbox.com/en-US/play/games/XXX/C496CLVXMJP8' }, { url: 'https://www.xbox.com/en-US/games/store/game/C496CLVXMJP8' }]);
  assert.equal(result.title, 'Grand Theft Auto V');
  assert.deepEqual(result.official_stores, [{ url: 'https://www.xbox.com/en-US/games/store/game/C496CLVXMJP8' }]);
  assert.equal(consoleFormSource('', []), null);
  assert.notEqual(dlcKey({ provider: 'xbox', app_id: 'same' }), dlcKey({ provider: 'playstation', app_id: 'same' }));
});

test('unsaved form links trigger the same Steam parent regardless of selected store or locale', () => {
  const official = JSON.stringify([{ source: 'steam', url: 'https://store.steampowered.com/app/10/Game?l=english' }, { store_id: 's', url: 'https://store.steampowered.com/app/10' }]);
  assert.deepEqual(steamFormLinks(official, [{ url: 'https://store.steampowered.com/app/11/Game' }]), ['https://store.steampowered.com/app/10', 'https://store.steampowered.com/app/11']);
  assert.deepEqual(steamFormLinks('{', [{ url: 'https://store.steampowered.com.evil.test/app/10' }, {}]), []);
});
test('downloads every detail sequentially and counts failed items separately', async () => {
  const events = [], requests = [];
  let active = 0;
  const report = await runDlcBatch([{ app_id: '1' }, { app_id: '2' }, { app_id: '3' }], async item => {
    assert.equal(active++, 0);
    requests.push(item.app_id);
    await Promise.resolve(); active--;
    if (item.app_id === '2') throw { data: { message: 'Unavailable' } };
    return { state: 'ready', title: item.app_id };
  }, (item, result) => events.push([item.app_id, result.state, result.message]));
  assert.deepEqual(requests, ['1', '2', '3']);
  assert.deepEqual(report, { saved: 2, failed: 1 });
  assert.deepEqual(events.filter(row => row[1] !== 'loading'), [['1', 'ready', undefined], ['2', 'error', 'Unavailable'], ['3', 'ready', undefined]]);
});
test('changing the parent drops an old response and prevents requests for remaining old DLCs', async () => {
  let current = true;
  const events = [], requests = [];
  await runDlcBatch([{ app_id: 'old-1' }, { app_id: 'old-2' }], async item => {
    requests.push(item.app_id); current = false;
    return { state: 'ready' };
  }, (item, result) => events.push(result.state), () => current);
  assert.deepEqual(requests, ['old-1']);
  assert.deepEqual(events, ['loading']);
});

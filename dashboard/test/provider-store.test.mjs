import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchProviderStore, selectProviderStores } from '../src/pages/games/providerStoreUtils.js';

const options = [{ _id: 's', code: 'steam' }, { _id: 'x', code: 'xbox-store' }, { _id: 'e', code: 'epic-games' }];
test('matches repeated official links and provider aliases', () => {
  const rows = [{ source: 'steam' }, ...Array.from({ length: 7 }, () => ({ source: 'xbox' })), { source: 'epicgames' }];
  assert.deepEqual(selectProviderStores(rows, options).map(row => row.store_id), ['s', ...Array(7).fill('x'), 'e']);
});
test('uses product domains, rejects lookalikes and waits for options', () => {
  assert.equal(matchProviderStore({ url: 'https://store.epicgames.com/en-US/p/game' }, options), 'e');
  assert.equal(matchProviderStore({ url: 'https://www.xbox.com/en-US/play/games/XXX/id' }, options), 'x');
  assert.equal(matchProviderStore({ url: 'https://xbox.com.evil.test/game' }, options), undefined);
  assert.equal(matchProviderStore({ source: 'steam' }, []), undefined);
});
test('preserves manual choices and leaves unknown sources alone', () => {
  const rows = [{ source: 'steam', store_id: 'manual' }, { source: 'unknown' }];
  const result = selectProviderStores(rows, options);
  rows.forEach((row, index) => assert.equal(result[index], row));
});
test('fills null relations returned by the server', () => {
  assert.equal(selectProviderStores([{ source: 'xbox', store_id: null }], options)[0].store_id, 'x');
});

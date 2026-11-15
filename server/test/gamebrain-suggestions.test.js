const { test } = require('node:test');
const assert = require('node:assert/strict');
const api = require('../services/gamebrain.service');
test('title match leads genre matches, ranks popular prefixes and deduplicates identities', () => {
  const rows = [
    { id: 1, name: 'VA-11 Hall-A: Cyberpunk Bartender Action', rating: { count: 14000 } },
    { id: 2, name: 'Cyberpunk City Fashion', rating: { count: 31000 } },
    { id: 3, name: 'Cyberpunk 2077', rating: { count: 500000 } },
    { id: 4, name: 'Stray', rating: { count: 999999 } },
    { id: 3, name: 'Cyberpunk 2077', rating: { count: 500000 } },
  ];
  assert.deepEqual(api.rankSuggestions(rows, 'Cyberpunk', 8).map(row => row.id), [3, 2, 1]);
  assert.equal(api.rankSuggestions(rows, 'Cyberpunk 2077', 8)[0].id, 3);
});
test('combines both endpoints sequentially and caches repeated type-ahead requests', async t => {
  const calls = [];
  t.mock.method(api, 'suggestions', async () => { calls.push('suggest'); return { results: [{ id: 1, name: 'Cyberpunk City Fashion' }] }; });
  t.mock.method(api, 'search', async query => { calls.push('search'); assert.equal(query.query, '"Cyberpunk regression"'); return { results: [{ id: 2, name: 'Cyberpunk regression' }, { id: 3, name: 'Unrelated' }] }; });
  const first = await api.lookupSuggestions({ query: 'Cyberpunk regression', limit: '8' });
  assert.equal(first.results[0].id, 2);
  assert.deepEqual(await api.lookupSuggestions({ query: 'Cyberpunk regression', limit: '8' }), first);
  assert.deepEqual(calls, ['suggest', 'search']);
});
test('keeps autocomplete available when the additional search fails', async t => {
  t.mock.method(api, 'suggestions', async () => ({ results: [{ id: 1, name: 'Fallback regression' }] }));
  t.mock.method(api, 'search', async () => { throw Object.assign(new Error('Quota'), { status: 402 }); });
  assert.equal((await api.lookupSuggestions({ query: 'Fallback regression' })).results[0].id, 1);
});
test('preserves translated provider matches even when the displayed title uses another alphabet', () => {
  const rows = [{ id: 1, name: 'Cyberpunk 2077' }, { id: 2, name: 'Unrelated semantic result' }];
  assert.deepEqual(api.rankSuggestions(rows, '赛博朋克', 8, new Set(['1'])).map(row => row.id), [1]);
  assert.deepEqual(api.rankSuggestions([{ id: 3, name: 'The Witcher 3', aliases: ['ویچر ۳'] }], 'ویچر ۳', 8).map(row => row.id), [3]);
});
test('normalizes Roman numerals, accents and Persian digits without confusing sequels', () => {
  const rows = [{ id: 1, name: 'Dark Souls III' }, { id: 2, name: 'Dark Souls II' }, { id: 3, name: 'God of War Ragnarök' }];
  assert.deepEqual(api.rankSuggestions(rows, 'Dark Souls 3', 8).map(row => row.id), [1]);
  assert.deepEqual(api.rankSuggestions(rows, 'Dark Souls ۳', 8).map(row => row.id), [1]);
  assert.equal(api.rankSuggestions(rows, 'God of War Ragnarok', 8)[0].id, 3);
});
test('handles small misspellings in returned candidates and keeps distinct editions with the same name', () => {
  const rows = [{ id: 1, name: 'Cyberpunk 2077' }, { id: 2, name: 'Cyberpunk 2077', year: 2020 }, { id: 3, name: 'Cyberpunk 2078' }];
  assert.deepEqual(api.rankSuggestions(rows, 'cyperpunk 2077', 8).map(row => row.id), [1, 2]);
  assert.deepEqual(api.rankSuggestions([{ id: 4, name: 'Resident Evil' }], 'Resdient Evil', 8).map(row => row.id), [4]);
});

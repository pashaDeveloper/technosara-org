const { test } = require('node:test');
const assert = require('node:assert/strict');
const { gamebrainValues } = require('../utils/gamebrainValues');

test('purchase relations survive JSON and multipart parsing with source metadata', () => {
  const store_id = '507f1f77bcf86cd799439011';
  const platform_id = '507f1f77bcf86cd799439012';
  const payload = {
    offers: [{ store_id, platform_id, store_name: 'Steam', platform: 'PC', url: 'https://example.com/game', price: { value: 10, currency: 'USD' } }],
    official_stores: [{ store_id, source: 'steam', url: 'https://example.com/game' }],
  };
  for (const input of [payload, Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, JSON.stringify(value)]))]) {
    const parsed = gamebrainValues(input);
    assert.equal(String(parsed.offers[0].store_id), store_id);
    assert.equal(String(parsed.offers[0].platform_id), platform_id);
    assert.equal(String(parsed.official_stores[0].store_id), store_id);
    assert.equal(parsed.offers[0].store_name, 'Steam');
    assert.equal(parsed.offers[0].price.value, 10);
  }
});

test('legacy purchases remain valid and invalid relation identifiers are rejected', () => {
  assert.equal(gamebrainValues({ offers: [{ store_name: 'Steam', platform: 'PC' }] }).offers[0].store_id, null);
  assert.throws(() => gamebrainValues({ offers: [{ store_id: 'invalid' }] }), error => error.status === 400);
  assert.throws(() => gamebrainValues({ offers: [{ platform_id: 'invalid' }] }), error => error.status === 400);
  assert.throws(() => gamebrainValues({ official_stores: [{ store_id: 'invalid' }] }), error => error.status === 400);
});

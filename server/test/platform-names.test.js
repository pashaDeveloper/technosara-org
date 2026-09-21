const { test } = require('node:test');
const assert = require('node:assert/strict');
const { shortName, platformCode } = require('../utils/platformNames');

test('console identifiers support repeated and non-Latin names', () => {
  assert.equal(shortName('Play Station 5'), 'PS5');
  assert.equal(shortName(' Nintendo Switch '), 'NS');
  assert.ok(shortName('کنسول جدید'));
  assert.notEqual(platformCode('Play Station 5'), platformCode('Play Station 5'));
  assert.match(platformCode('کنسول جدید'), /^کنسول-جدید-/);
});

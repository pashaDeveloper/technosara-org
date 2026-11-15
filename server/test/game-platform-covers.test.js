const { test } = require('node:test');
const assert = require('node:assert/strict');
const { gamebrainValues } = require('../utils/gamebrainValues');

test('two cover qualities remain associated with each platform in JSON and multipart', () => {
  const rows = [
    { platform_id: '507f1f77bcf86cd799439011', low_quality: 'https://example.com/low.jpg', high_quality: 'https://example.com/high.jpg' },
    { platform_id: '507f1f77bcf86cd799439012', high_quality: 'https://example.com/other.jpg' },
  ];
  for (const value of [rows, JSON.stringify(rows)]) {
    const result = gamebrainValues({ platform_covers: value }).platform_covers;
    assert.equal(result.length, 2);
    assert.equal(String(result[0].platform_id), rows[0].platform_id);
    assert.equal(result[0].low_quality, rows[0].low_quality);
    assert.equal(result[0].high_quality, rows[0].high_quality);
    assert.equal(result[1].high_quality, rows[1].high_quality);
    assert.equal(result[1].low_quality, null);
  }
  assert.deepEqual(gamebrainValues({}), {});
  assert.equal(gamebrainValues({ platform_covers: [] }).platform_covers.length, 0);
});

test('invalid platform IDs, unsafe URLs and duplicate platform covers are rejected', () => {
  const row = { platform_id: '507f1f77bcf86cd799439011', low_quality: 'https://example.com/low.jpg' };
  for (const rows of [[{ ...row, platform_id: 'invalid' }], [{ ...row, high_quality: 'javascript:alert(1)' }], [row, row]]) {
    assert.throws(() => gamebrainValues({ platform_covers: rows }), error => error.status === 400);
  }
});

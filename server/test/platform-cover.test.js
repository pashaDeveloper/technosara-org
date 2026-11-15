const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Media = require('../models/media.model');

test('a platform cover supports low-only registration and later independent high quality', async () => {
  const cover = new Media({ game_id: new mongoose.Types.ObjectId(), platform_id: new mongoose.Types.ObjectId(), media_type: 'cover', pic1: 'https://example.com/low.jpg' });
  await cover.validate();
  assert.equal(cover.url, cover.pic1);
  cover.pic2 = 'https://example.com/high.jpg';
  await cover.validate();
  assert.equal(cover.url, cover.pic2);
  assert.equal(cover.pic1, 'https://example.com/low.jpg');
  cover.pic2 = null;
  await cover.validate();
  assert.equal(cover.url, cover.pic1);
});

test('legacy media with a single URL remain valid', async () => {
  const media = new Media({ game_id: new mongoose.Types.ObjectId(), media_type: 'cover', url: 'https://example.com/legacy.jpg' });
  await media.validate();
  assert.equal(media.platform_id, null);
  assert.equal(media.url, 'https://example.com/legacy.jpg');
});

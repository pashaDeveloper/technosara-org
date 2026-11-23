const { test } = require('node:test');
const assert = require('node:assert/strict');
const Game = require('../models/game.model');
const gamebrain = require('../services/gamebrain.service');
const steam = require('../services/steamDlc.service');
const { recover } = require('../services/gameRecovery.service');

const source = { id: 42, name: 'Test Game', image: 'https://example.com/cover.jpg', screenshots: ['https://example.com/shot.jpg'] };
const trailer = 'https://example.com/trailer.mp4';

function mockRecord(t, fields) {
  const record = {
    _id: 'game', id: 42, title: 'Test Game', release_date: new Date(), developer: 'Studio',
    developer_ids: ['studio'], publisher_ids: ['publisher'], detail_banner: source.image,
    detail_poster: source.image, gamebrain_source: source, ...fields,
  };
  t.mock.method(Game, 'findById', () => ({ lean: async () => ({ ...record }) }));
  t.mock.method(Game, 'updateOne', async (_query, { $set }) => Object.assign(record, $set));
}

test('recovery refreshes an empty video source and saves the returned URLs', async t => {
  mockRecord(t, { videos: [] });
  const api = t.mock.method(gamebrain, 'details', async () => ({ ...source, videos: [trailer], micro_trailer: trailer }));
  const { record } = await recover('game');
  assert.equal(api.mock.callCount(), 1);
  assert.deepEqual(record.videos, [trailer]);
  assert.equal(record.micro_trailer, trailer);
});

test('recovery keeps a saved video without requesting a replacement', async t => {
  mockRecord(t, { videos: [trailer] });
  const api = t.mock.method(gamebrain, 'details');
  const { record } = await recover('game');
  assert.equal(api.mock.callCount(), 0);
  assert.deepEqual(record.videos, [trailer]);
});

test('recovery uses the linked Steam game if GameBrain has no video', async t => {
  mockRecord(t, { official_stores: [{ url: 'https://store.steampowered.com/app/42/' }] });
  t.mock.method(gamebrain, 'details', async () => source);
  const api = t.mock.method(steam, 'details', async () => ({ name: 'Test Game', movies: [{ mp4: { max: trailer } }] }));
  const { record } = await recover('game');
  assert.equal(api.mock.callCount(), 1);
  assert.deepEqual(record.videos, [trailer]);
});

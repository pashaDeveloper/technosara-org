const { test } = require('node:test');
const assert = require('node:assert/strict');
const Game = require('../models/game.model');
const Media = require('../models/media.model');
const GamePlatform = require('../models/gamePlatform.model');
const catalog = require('../services/catalog.service');
const { deleteGame } = require('../services/game.service');

function response() {
  return { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

test('game deletion permanently deletes its media and platform links before deleting the game', async t => {
  const id = '507f1f77bcf86cd799439011';
  const calls = [];
  t.mock.method(catalog, 'assertDeletable', async (Model, value, options) => {
    assert.equal(Model, Game);
    assert.equal(value, id);
    assert.deepEqual(options, { cascadingModels: ['Media', 'GamePlatform'] });
  });
  t.mock.method(Game, 'findById', async () => ({ _id: id }));
  t.mock.method(Media, 'deleteMany', async filter => {
    assert.deepEqual(filter, { game_id: id });
    calls.push('media');
  });
  t.mock.method(GamePlatform, 'deleteMany', async filter => {
    assert.deepEqual(filter, { game_id: id });
    calls.push('platform links');
  });
  t.mock.method(Game, 'findByIdAndDelete', async value => {
    assert.equal(value, id);
    assert.deepEqual(calls, ['media', 'platform links']);
    return { _id: id };
  });
  const res = response();
  await deleteGame({ params: { id } }, res);
  assert.equal(res.code, 200);
});

test('blocked or missing games do not delete media', async t => {
  const guard = t.mock.method(catalog, 'assertDeletable', async () => { throw Object.assign(new Error('Referenced'), { status: 409 }); });
  const media = t.mock.method(Media, 'deleteMany', async () => {});
  const platformLinks = t.mock.method(GamePlatform, 'deleteMany', async () => {});
  const game = t.mock.method(Game, 'findByIdAndDelete', async () => {});
  const req = { params: { id: '507f1f77bcf86cd799439011' } };
  await assert.rejects(deleteGame(req, response()), { status: 409 });
  guard.mock.mockImplementation(async () => {});
  t.mock.method(Game, 'findById', async () => null);
  const res = response();
  await deleteGame(req, res);
  assert.equal(res.code, 404);
  assert.equal(media.mock.callCount(), 0);
  assert.equal(platformLinks.mock.callCount(), 0);
  assert.equal(game.mock.callCount(), 0);
});

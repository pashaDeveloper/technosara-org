const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const GameTag = require('../models/tag.model');
const Game = require('../models/game.model');
const { gameTagFilter } = require('../utils/gameTagFilter');
const { collectionGames } = require('../utils/collectionGames');
const id = () => String(new mongoose.Types.ObjectId());
test('shared tags produce unique related games and exclude the source game', async t => {
  const source = id(), first = id(), second = id();
  let query;
  t.mock.method(GameTag, 'find', value => { query = value; return { select: () => ({ lean: async () => [{ game_ids: [source, first] }, { game_ids: [first, second, source] }] }) }; });
  assert.deepEqual(await gameTagFilter({ related_to: source }), { $in: [first, second] });
  assert.deepEqual(query, { is_active: true, game_ids: source });
});
test('tag filtering supports one tag and returns no unrelated games for empty tags', async t => {
  const tag = id();
  let query;
  t.mock.method(GameTag, 'find', value => { query = value; return { select: () => ({ lean: async () => [] }) }; });
  assert.deepEqual(await gameTagFilter({ game_tag_id: tag }), { $in: [] });
  assert.deepEqual(query, { is_active: true, _id: tag });
  await assert.rejects(gameTagFilter({ related_to: 'bad' }), { status: 400 });
  await assert.rejects(gameTagFilter({ game_tag_id: {} }), { status: 400 });
});
test('game membership rejects missing games and accepts deduplicated JSON arrays', async t => {
  const game = id();
  t.mock.method(Game, 'countDocuments', async query => query._id.$in.includes(game) ? 1 : 0);
  assert.deepEqual(await collectionGames(JSON.stringify([game, game])), [game]);
  assert.deepEqual(await collectionGames([]), []);
  assert.equal(await collectionGames(undefined), undefined);
  await assert.rejects(collectionGames([id()]), { status: 400 });
  await assert.rejects(collectionGames('{'), { status: 400 });
});
test('game tags use their own model and allow a game in multiple tags', () => {
  const game = id();
  const first = new GameTag({ name: 'Story rich', slug: 'story-rich', game_ids: [game] });
  const second = new GameTag({ name: 'Co-op', slug: 'co-op', game_ids: [game] });
  assert.equal(first.validateSync(), undefined);
  assert.equal(second.validateSync(), undefined);
  assert.equal(GameTag.modelName, 'Tag');
  assert.equal(String(first.game_ids[0]), String(second.game_ids[0]));
  assert.ok(new GameTag({ name: 'Invalid', slug: 'invalid', game_ids: ['bad'] }).validateSync());
});

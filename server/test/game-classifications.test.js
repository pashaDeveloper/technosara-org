const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Game = require('../models/game.model');
const GameMode = require('../models/gameMode.model');
const GameSeries = require('../models/gameSeries.model');
const { gameClassificationValues, gameClassificationFilters } = require('../utils/gameClassifications');
const service = require('../services/game.service');
const id = () => String(new mongoose.Types.ObjectId());
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } });
test('classification fields accept arrays and JSON, deduplicate, preserve omitted and clear empty values', async t => {
  const mode = id(), series = id();
  t.mock.method(GameMode, 'countDocuments', async () => 1);
  t.mock.method(GameSeries, 'countDocuments', async () => 1);
  assert.deepEqual(await gameClassificationValues({ game_mode_ids: [mode, mode.toUpperCase()], game_series_ids: JSON.stringify([series]) }), { game_mode_ids: [mode], game_series_ids: [series] });
  assert.deepEqual(await gameClassificationValues({}), {});
  assert.deepEqual(await gameClassificationValues({ game_mode_ids: [], game_series_ids: '[]' }), { game_mode_ids: [], game_series_ids: [] });
});
test('classification fields reject malformed, nonexistent and deleted references', async t => {
  t.mock.method(GameMode, 'countDocuments', async () => 0);
  for (const value of [null, {}, '{', ['bad'], [id()]]) await assert.rejects(gameClassificationValues({ game_mode_ids: value }), { status: 400 });
});
test('game creation and partial updates persist both classification relationships', async t => {
  const mode = id(), series = id();
  t.mock.method(GameMode, 'countDocuments', async () => 1);
  t.mock.method(GameSeries, 'countDocuments', async () => 1);
  let saved;
  t.mock.method(Game.prototype, 'save', async function () { saved = this; return this; });
  const res = response();
  await service.addGame({ body: { title: 'Test', slug: 'test', status: 'released', game_mode_ids: [mode], game_series_ids: [series] }, admin: { _id: id() } }, res);
  assert.equal(res.code, 201);
  assert.equal(String(saved.game_mode_ids[0]), mode);
  assert.equal(String(saved.game_series_ids[0]), series);
  let update;
  t.mock.method(Game, 'findByIdAndUpdate', async (key, body) => { update = body; return saved; });
  await service.updateGame({ params: { id: id() }, body: { title: 'Changed' } }, response());
  assert.equal(Object.hasOwn(update, 'game_mode_ids'), false);
  assert.equal(Object.hasOwn(update, 'game_series_ids'), false);
  await service.updateGame({ params: { id: id() }, body: { game_mode_ids: [], game_series_ids: [] } }, response());
  assert.deepEqual(update.game_mode_ids, []);
  assert.deepEqual(update.game_series_ids, []);
});
test('filters compose mode and series and reject invalid query types', () => {
  const mode = id(), series = id();
  assert.deepEqual(gameClassificationFilters({ game_mode_id: mode, game_series_id: series }), { game_mode_ids: mode, game_series_ids: series });
  assert.throws(() => gameClassificationFilters({ game_mode_id: ['bad'] }), { status: 400 });
});
test('new catalog models validate required names and slugs and stay separate', () => {
  for (const [Model, collection] of [[GameMode, 'game_modes'], [GameSeries, 'game_series']]) {
    assert.equal(Model.collection.name, collection);
    assert.ok(new Model({}).validateSync());
    const record = new Model({ name: 'Name', name_en: 'Name', slug: 'name' });
    assert.equal(record.validateSync(), undefined);
    assert.equal(record.is_active, true);
  }
});

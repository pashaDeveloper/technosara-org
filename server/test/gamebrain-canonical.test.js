const { test } = require('node:test');
const assert = require('node:assert/strict');
const Game = require('../models/game.model');
const { namedValues } = require('../scripts/migrate-gamebrain-canonical.cjs');
const snapshot = require('../data/gamebrain/responses.json').details.body;
const api = require('../services/gamebrain.service');

test('every detail field from the actual API has a canonical typed Game path', async () => {
  const game = new Game({ ...api.mapGame(snapshot).game, slug: 'canonical-test', status: 'released' });
  await game.validate();
  for (const key of Object.keys(snapshot)) assert.ok(Game.schema.path(key), `Missing ${key}`);
  assert.equal(game.id, snapshot.id); assert.equal(game.name, snapshot.name);
  assert.equal(game.link, snapshot.link); assert.equal(game.image, snapshot.image);
  assert.equal(game.themes[0].value, snapshot.themes[0].value);
  assert.equal(game.play_modes[0].name, snapshot.play_modes[0].name);
  assert.equal(game.offers[0].price.value, snapshot.offers[0].price.value);
  assert.equal(game.rating.mean_critics, undefined);
});

test('business models have one explicit definition and canonical collection names', () => {
  for (const [file, name] of [['theme', 'Theme'], ['tag', 'Tag'], ['gameMode', 'GameMode'], ['inputMode', 'InputMode']]) {
    const Model = require(`../models/${file}.model`);
    assert.equal(Model.modelName, name);
  }
  assert.equal(require('../models/tag.model').collection.name, 'game_tags');
});

test('migration moves Persian names without replacing an existing different translation', () => {
  assert.deepEqual(namedValues({ name: 'تاریخی', name_en: 'Historical', value: 'historical' }, { key: 'historical', name: 'Historical' }), { name_fa: 'تاریخی', name: 'Historical', key: 'historical' });
  assert.throws(() => namedValues({ _id: 'test', name: 'قدیمی', name_fa: 'متفاوت', name_en: 'Old' }), /Conflicting/);
  assert.deepEqual(namedValues({ name: 'Historical', name_fa: 'تاریخی', name_en: 'Historical', value: 'historical', key: 'historical' }, { key: 'historical', name: 'Historical' }), {});
});

test('canonical creates and edits retain old interfaces without using MongoDB identity as provider identity', async () => {
  const Theme = require('../models/theme.model');
  const theme = new Theme({ name: 'Historical', name_fa: 'تاریخی', value: 'historical', slug: 'historical' });
  await theme.validate();
  assert.equal(theme.name, 'Historical'); assert.equal(theme.name_fa, 'تاریخی');
  assert.equal(theme.value, 'historical');
  const game = new Game({ name: 'Example', id: 123, slug: 'example', status: 'released' });
  await game.validate();
  assert.equal(game.title, 'Example'); assert.equal(game.id, 123);
  assert.notEqual(String(game._id), String(game.id));
  const projected = require('../services/gamebrainDocument').toProvider(game);
  assert.equal(projected.id, 123); assert.equal(projected.name, 'Example');
  assert.equal(Object.hasOwn(projected, 'title'), false);
  assert.equal(Object.hasOwn(projected, 'id'), true);
});

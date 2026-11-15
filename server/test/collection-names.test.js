const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renames } = require('../scripts/migrate-catalog-collection-names.cjs');

test('catalog collection names match their models and retain ObjectId reference targets', () => {
  const { resources } = require('../services/catalog.service');
  for (const [file, , collection] of renames) {
    const Model = require(`../models/${file}.model`);
    assert.equal(Model.collection.name, collection, Model.modelName);
    assert.equal(resources[collection.replace(/_/g, '-')], Model, `API resource for ${Model.modelName}`);
  }
  const Game = require('../models/game.model');
  assert.equal(Game.schema.path('theme_ids').caster.options.ref, 'Theme');
  assert.equal(Game.schema.path('game_mode_ids').caster.options.ref, 'GameMode');
  assert.equal(require('../models/gamePlatform.model').schema.path('platform_id').options.ref, 'Platform');
});

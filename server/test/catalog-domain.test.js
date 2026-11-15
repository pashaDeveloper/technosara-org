const { test } = require('node:test');
const assert = require('node:assert/strict');
const Content = require('../models/gameContent.model');
const service = require('../services/catalog.service');
const Game = require('../models/game.model');
test('filters reject operator injection and writes protect audit fields', () => {
  assert.throws(() => service.filters(Game, { developer_ids: { $ne: null } }));
  assert.deepEqual(service.writable(Content, { creator: 'ignored', isDeleted: true, title: 'Allowed', unsupported: 'x' }), { title: 'Allowed' });
  assert.ok(service.resources['game-contents']);
  assert.equal(service.resources.editions.modelName, 'Edition');
});

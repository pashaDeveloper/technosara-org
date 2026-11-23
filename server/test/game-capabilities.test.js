const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { infer, validateStates, capabilityValues } = require('../utils/gameCapabilities');
const Game = require('../models/game.model');
const Mode = require('../models/gameMode.model');
const Feature = require('../models/feature.model');
const Platform = require('../models/platform.model');
const id = () => new mongoose.Types.ObjectId().toString();

test('only explicit provider evidence is mapped; generic multiplayer does not imply online', () => {
  assert.deepEqual(infer({ play_modes: [{ value: 'multi_player' }, { name: 'Co-Op' }, { name: '2-Players' }], tags: ['Multiplayer', '4K'] }), {});
  assert.deepEqual(infer({ play_modes: [{ name: 'Single-Player' }, { name: 'Local Co-Op' }, { value: 'online_multi_player' }, { name: '4 Player Local' }], tags: ['Steam Cloud', 'Cross-Platform Multiplayer'] }), { single_player: true, online_multiplayer: true, local_multiplayer: true, local_coop: true, crossplay: true, cloud_saves: true });
});

test('capabilities store booleans, normalize legacy nulls to false and reject invalid states', () => {
  const game = new Game({ capability_status: { single_player: true, local_coop: false, cloud_saves: null, hdr: true }, platform_capabilities: [{ platform_id: id(), status: { '4k': true, hdr: null, '120fps': false } }] });
  assert.deepEqual(game.capability_status.toObject(), { single_player: true, local_coop: false, cloud_saves: false, hdr: true });
  assert.equal(game.platform_capabilities[0].status.hdr, false);
  assert.deepEqual(validateStates({ cloud_saves: null, single_player: true }, 'global'), { cloud_saves: false, single_player: true });
  assert.equal(game.platform_capabilities[0].status['120fps'], false);
  for (const states of [{ unknown: true }, { single_player: 'false' }, [], null]) assert.throws(() => validateStates(states, 'global'), { status: 400 });
});

test('saves switches into relationships, removes disabled links and keeps unrelated modes', async t => {
  const single = id(), local = id(), other = id(), cloud = id();
  t.mock.method(Mode, 'find', async () => [{ _id: single, value: 'single_player' }, { _id: local, name_en: 'Local Co-Op' }]);
  t.mock.method(Feature, 'find', async () => []);
  t.mock.method(Feature, 'findOneAndUpdate', async (query, update) => { assert.equal(query.code, 'cloud_saves'); assert.equal(update.$setOnInsert.name, 'ذخیرهٔ ابری'); return { _id: cloud }; });
  const result = await capabilityValues({ capability_status: { single_player: true, local_coop: false, cloud_saves: true }, game_mode_ids: [local, other], feature_ids: [] });
  assert.deepEqual(result.game_mode_ids, [other, single]);
  assert.deepEqual(result.feature_ids, [cloud]);
  assert.deepEqual(await capabilityValues({ title: 'Unrelated update' }), {});
});

test('platform features remain linked while any platform supports them and reject bad platforms', async t => {
  const hdr = id(), ps5 = id(), pc = id();
  t.mock.method(Mode, 'find', async () => []);
  t.mock.method(Feature, 'find', async () => [{ _id: hdr, code: 'hdr' }]);
  t.mock.method(Platform, 'countDocuments', async () => 2);
  let result = await capabilityValues({ platform_capabilities: [{ platform_id: ps5, status: { hdr: false } }, { platform_id: pc, status: { hdr: true } }], feature_ids: [hdr] });
  assert.deepEqual(result.feature_ids, [hdr]);
  result = await capabilityValues({ platform_capabilities: [], feature_ids: [hdr] }, { platform_capabilities: [{ platform_id: pc, status: { hdr: true } }] });
  assert.deepEqual(result.feature_ids, []);
  result = await capabilityValues({ capability_status: { hdr: false }, feature_ids: [hdr] }, {
    platform_capabilities: [{ platform_id: pc, status: { hdr: true } }],
  });
  assert.deepEqual(result.feature_ids, []);
  await assert.rejects(capabilityValues({ platform_capabilities: [{ platform_id: 'invalid', status: {} }] }), { status: 400 });
});

test('capability filters include legacy evidence only when the game has no explicit status', async t => {
  const { capabilityFilter } = require('../utils/gameCapabilities');
  const hdr = id();
  t.mock.method(Feature, 'find', async () => [{ _id: hdr, code: 'hdr' }]);
  assert.deepEqual(await capabilityFilter('has_game_pass'), { has_game_pass: true });
  assert.deepEqual(await capabilityFilter('hdr'), { $and: [{ $or: [
    { 'capability_status.hdr': true },
    { 'capability_status.hdr': { $exists: false }, 'platform_capabilities.status.hdr': true },
    { 'capability_status.hdr': { $exists: false }, feature_ids: { $in: [hdr] } },
  ] }] });
  await assert.rejects(capabilityFilter({ $ne: '' }), { status: 400 });
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { catalogs, candidate } = require('../utils/gameRelations');
const { planCatalog } = require('../scripts/seed-gamebrain-catalog.cjs');
const snapshot = require('../data/gamebrain/filters.json');

test('every live dependency group has a typed model and every option validates', async () => {
  for (const group of snapshot.filter_options) {
    const entry = catalogs[group.key];
    assert.ok(entry, group.key);
    const plan = await planCatalog(entry.Model, [], group.values, new mongoose.Types.ObjectId());
    assert.equal(plan.summary.created, group.values.length);
    assert.equal(plan.operations.length, group.values.length);
    assert.ok(plan.operations.every(operation => operation.insertOne.document.value));
    assert.ok(plan.operations.every(operation => operation.insertOne.document.name_en));
    assert.ok(plan.operations.every(operation => operation.insertOne.document.name));
  }
});

test('canonical backfill moves the local Persian name into name_fa', async () => {
  const Model = catalogs.platform.Model;
  const original = { _id: new mongoose.Types.ObjectId(), name: 'پلی‌استیشن ۵', code: 'ps5', value: 'playstation_5' };
  const plan = await planCatalog(Model, [original], [{ key: 'playstation_5', name: 'Playstation 5' }]);
  assert.deepEqual(plan.operations[0].updateOne.update, { $set: { name: 'Playstation 5', name_en: 'Playstation 5', name_fa: 'پلی‌استیشن ۵', value: 'playstation_5', key: 'playstation_5' } });
  assert.equal(original.name, 'پلی‌استیشن ۵');
});

test('catalog planning reuses exact identities, preserves Persian metadata and is idempotent', async () => {
  const Model = catalogs.play_mode.Model;
  const original = { _id: new mongoose.Types.ObjectId(), name: 'تک‌نفره', name_en: 'Single Player', slug: 'single-player', description: 'Existing description' };
  const plan = await planCatalog(Model, [{ ...original }], [{ key: 'single_player', name: 'Single-Player' }]);
  assert.equal(plan.summary.created, 0); assert.equal(plan.summary.mapped, 1);
  assert.equal(plan.operations[0].updateOne.update.$set.name_fa, 'تک‌نفره');
  assert.equal(plan.operations[0].updateOne.update.$set.name, 'Single-Player');
  const repeated = await planCatalog(Model, [{ ...original, name: 'Single-Player', name_fa: original.name, name_en: 'Single-Player', value: 'single_player', key: 'single_player' }], [{ key: 'single_player', name: 'Single-Player' }]);
  assert.equal(repeated.operations.length, 0);
  assert.equal(repeated.summary.unchanged, 1);
});

test('ambiguous, deleted and conflicting existing catalog entries stop writes', async () => {
  const Model = catalogs.theme.Model;
  assert.throws(() => candidate([{ name: 'Fantasy' }, { name_en: 'Fantasy' }], { key: 'fantasy', name: 'Fantasy' }, Model), { status: 409 });
  assert.throws(() => candidate([{ name: 'Fantasy', value: 'other' }], { key: 'fantasy', name: 'Fantasy' }, Model), { status: 409 });
  await assert.rejects(planCatalog(Model, [{ name: 'Fantasy', slug: 'fantasy', isDeleted: true }], [{ key: 'fantasy', name: 'Fantasy' }]), /Deleted/);
});

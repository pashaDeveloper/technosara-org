const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const data = require('../data/game-discovery.json');
const models = { collections: require('../models/collection.model'), gameTags: require('../models/tag.model') };
async function main() {
  const apply = process.argv.includes('--apply');
  const expected = process.argv.find(arg => arg.startsWith('--expected-db='))?.slice(14);
  assert.ok(expected, 'Pass --expected-db to identify the target database');
  await mongoose.connect(process.env.MONGO_URI || process.env.ATLAS_URI, { ...(process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {}), serverSelectionTimeoutMS: 10000 });
  assert.equal(mongoose.connection.name, expected);
  const db = mongoose.connection.db;
  const creators = await db.collection('genres').distinct('creator', { isDeleted: { $ne: true }, creator: { $ne: null } });
  assert.equal(creators.length, 1, 'Expected one existing catalog creator');
  const creator = creators[0];
  assert.ok(await db.collection('admins').findOne({ _id: creator, isDeleted: { $ne: true } }), 'Catalog creator must exist');
  const before = {}, plans = {};
  for (const [key, Model] of Object.entries(models)) {
    before[key] = await Model.find().setOptions({ withDeleted: true }).lean();
    const slugs = new Set(before[key].map(row => row.slug));
    let order = Math.max(-1, ...before[key].map(row => row.sort_order || 0)) + 1;
    plans[key] = [];
    for (const entry of data[key]) {
      assert.match(entry.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      if (slugs.has(entry.slug)) continue;
      slugs.add(entry.slug);
      const doc = new Model({ ...entry, creator, sort_order: order++, game_ids: [] });
      await doc.validate();
      plans[key].push(doc);
    }
  }
  const directory = path.resolve(__dirname, '../../reports');
  await fs.mkdir(directory, { recursive: true });
  const summary = { applied: apply, database: expected, groups: {} };
  if (apply) {
    summary.backup = path.join(directory, 'game-discovery-before-' + Date.now() + '.json');
    await fs.writeFile(summary.backup, mongoose.mongo.BSON.EJSON.stringify(before, { relaxed: false }));
  }
  for (const [key, docs] of Object.entries(plans)) {
    if (apply) for (const doc of docs) await doc.save();
    summary.groups[key] = { created: docs.length, skipped: data[key].length - docs.length };
    if (apply) for (const doc of docs) {
      const saved = await models[key].findById(doc._id).lean();
      for (const field of ['name', 'name_en', 'slug', 'description', 'sort_order', 'is_active']) assert.deepEqual(saved[field], doc[field]);
      assert.equal(String(saved.creator), String(creator));
      assert.equal(saved.game_ids.length, 0);
    }
  }
  summary.verified = apply;
  await fs.writeFile(path.join(directory, apply ? 'game-discovery-result.json' : 'game-discovery-preview.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());

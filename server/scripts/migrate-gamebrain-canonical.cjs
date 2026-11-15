const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { catalogs } = require('../utils/gameRelations');
const snapshot = require('../data/gamebrain/filters.json');
const Game = require('../models/game.model');
const Company = require('../models/company.model');
const Store = require('../models/store.model');
const persian = value => typeof value === 'string' && /[\u0600-\u06ff]/.test(value);

function namedValues(row, source) {
  const values = {};
  const english = source?.name || row.name_en || (!persian(row.name) ? row.name : undefined);
  if (persian(row.name)) {
    if (row.name_fa && row.name_fa !== row.name) throw new Error(`Conflicting Persian name: ${row._id}`);
    values.name_fa = row.name;
  }
  if (english) { values.name = english; values.name_en = english; }
  if (source?.key || row.value) { values.value = source?.key || row.value; values.key = values.value; }
  return Object.fromEntries(Object.entries(values).filter(([key, value]) => row[key] !== value));
}

async function main() {
  const apply = process.argv.includes('--apply');
  const verificationBackup = process.argv.find(arg => arg.startsWith('--verify-backup='))?.slice(16);
  const baseline = verificationBackup ? mongoose.mongo.BSON.EJSON.parse(await fs.readFile(verificationBackup, 'utf8')) : null;
  const expected = process.argv.find(arg => arg.startsWith('--expected-db='))?.slice(14);
  assert.ok(expected, 'Pass --expected-db');
  await mongoose.connect(process.env.MONGO_URI || process.env.ATLAS_URI, { ...(process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {}), serverSelectionTimeoutMS: 10000 });
  assert.equal(mongoose.connection.name, expected);
  const db = mongoose.connection.db, before = {}, batches = [];
  const byModel = new Map(Object.values(catalogs).map(({ Model }) => [Model.modelName, Model]));
  byModel.set(Company.modelName, Company); byModel.set(Store.modelName, Store);
  const report = { applied: apply || Boolean(verificationBackup), database: expected, groups: {}, persian_names_preserved: 0 };
  for (const Model of byModel.values()) {
    const rows = baseline?.[Model.collection.name] || await db.collection(Model.collection.name).find({}).toArray();
    before[Model.collection.name] = rows;
    const group = Object.entries(catalogs).find(([, value]) => value.Model === Model)?.[0];
    const sources = snapshot.filter_options.find(filter => filter.key === group)?.values || [];
    const operations = [];
    for (const row of rows) {
      const source = sources.find(item => item.key === row.value);
      const values = namedValues(row, source);
      if (persian(row.name)) report.persian_names_preserved++;
      if (Object.keys(values).length) operations.push({ updateOne: { filter: { _id: row._id, name: row.name }, update: { $set: values } } });
    }
    batches.push({ Model, operations });
    report.groups[Model.modelName] = { total: rows.length, updated: operations.length };
  }
  const games = baseline?.[Game.collection.name] || await db.collection(Game.collection.name).find({}).toArray();
  before[Game.collection.name] = games;
  const gameOperations = [];
  for (const row of games) {
    const values = {};
    if (row.name === undefined && row.title) values.name = row.title;
    for (const [canonical, legacy] of [['id', 'id'], ['link', 'link'], ['genre', 'genre']]) if (row[canonical] === undefined && row[legacy] != null) values[canonical] = row[legacy];
    if (persian(row.title) && !row.name_fa) values.name_fa = row.title;
    if (Object.keys(values).length) gameOperations.push({ updateOne: { filter: { _id: row._id }, update: { $set: values } } });
  }
  batches.push({ Model: Game, operations: gameOperations });
  report.groups.Game = { total: games.length, updated: gameOperations.length };
  const protectedCollections = ['achievements', 'achievement_groups', 'age_ratings', 'game_series', 'media', 'game_platforms', 'game_contents'];
  const protectedCounts = Object.fromEntries(await Promise.all(protectedCollections.map(async name => [name, await db.collection(name).countDocuments()])));
  const directory = path.resolve(__dirname, '../../reports');
  await fs.mkdir(directory, { recursive: true });
  if (apply || verificationBackup) {
    report.backup = verificationBackup || path.join(directory, `gamebrain-canonical-before-${Date.now()}.ejson`);
    if (apply) {
    await fs.writeFile(report.backup, mongoose.mongo.BSON.EJSON.stringify(before, { relaxed: false }));
    for (const { Model } of batches) await Model.init();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        for (const { Model, operations } of batches) if (operations.length) {
          const result = await Model.bulkWrite(operations, { session, ordered: true });
          assert.equal(result.matchedCount, operations.length, 'Records changed after planning');
        }
      });
    } finally { await session.endSession(); }
    }
    for (const { Model } of batches) {
      const after = await db.collection(Model.collection.name).find({}).toArray();
      assert.equal(after.length, before[Model.collection.name].length);
      for (const row of before[Model.collection.name]) {
        const saved = after.find(item => String(item._id) === String(row._id));
        assert.ok(saved);
        if (persian(row.name)) assert.equal(saved.name_fa, row.name, 'Persian name lost');
        for (const [field, value] of Object.entries(row)) if (!['name', 'name_en', 'name_fa', 'value', 'key', 'updatedAt', 'updated_at'].includes(field)) assert.deepEqual(saved[field], value, `${Model.modelName}.${field} changed`);
      }
    }
    for (const name of protectedCollections) assert.equal(await db.collection(name).countDocuments(), protectedCounts[name]);
    for (const filter of snapshot.filter_options) {
      const { Model } = catalogs[filter.key];
      const rows = await db.collection(Model.collection.name).find({ value: { $in: filter.values.map(item => item.key) } }).toArray();
      assert.equal(rows.length, filter.values.length);
      for (const option of filter.values) {
        const row = rows.find(item => item.value === option.key);
        assert.equal(row.name, option.name); assert.equal(row.value, option.key);
      }
    }
    report.api_dependencies_verified = snapshot.filter_options.reduce((sum, filter) => sum + filter.values.length, 0);
    report.verified = true;
    report.protected_counts = protectedCounts;
  }
  await fs.writeFile(path.join(directory, apply || verificationBackup ? 'gamebrain-canonical-result.json' : 'gamebrain-canonical-preview.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
module.exports = { namedValues };

const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { catalogs } = require('../utils/gameRelations');
const snapshot = require('../data/gamebrain/filters.json');

async function main() {
  const expected = process.argv.find(arg => arg.startsWith('--expected-db='))?.slice(14);
  assert.ok(expected, 'Pass --expected-db');
  const apply = process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGO_URI || process.env.ATLAS_URI, { ...(process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {}), serverSelectionTimeoutMS: 10000 });
  assert.equal(mongoose.connection.name, expected);
  const db = mongoose.connection.db, before = {}, plans = [];
  const report = { applied: apply, database: expected, groups: {}, name_fields_changed: 0 };
  for (const group of snapshot.filter_options) {
    const { Model } = catalogs[group.key];
    const rows = await db.collection(Model.collection.name).find({}).toArray();
    before[Model.collection.name] = rows;
    const operations = [];
    for (const option of group.values) {
      const row = rows.find(doc => doc.value === option.key && !doc.isDeleted);
      assert.ok(row, `Missing ${group.key}:${option.key}`);
      if (!row.name_en?.trim()) operations.push({ updateOne: { filter: { _id: row._id, name_en: row.name_en === undefined ? { $exists: false } : row.name_en }, update: { $set: { name_en: option.name } } } });
    }
    plans.push({ Model, operations });
    report.groups[group.key] = { total: group.values.length, english_filled: operations.length };
  }
  const directory = path.resolve(__dirname, '../../reports');
  await fs.mkdir(directory, { recursive: true });
  if (apply) {
    report.backup = path.join(directory, `gamebrain-english-names-before-${Date.now()}.ejson`);
    await fs.writeFile(report.backup, mongoose.mongo.BSON.EJSON.stringify(before, { relaxed: false }));
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        for (const { Model, operations } of plans) if (operations.length) {
          const result = await Model.bulkWrite(operations, { session });
          assert.equal(result.matchedCount, operations.length, 'Catalog changed during migration');
        }
      });
    } finally { await session.endSession(); }
    for (const { Model } of plans) {
      const rows = await db.collection(Model.collection.name).find({}).toArray();
      for (const original of before[Model.collection.name]) {
        const row = rows.find(doc => String(doc._id) === String(original._id));
        assert.ok(row);
        assert.deepEqual(row.name, original.name, 'Persian/local name changed');
        for (const [field, value] of Object.entries(original)) if (!['name_en', 'updatedAt'].includes(field)) assert.deepEqual(row[field], value, `${field} changed`);
        if (original.name_en?.trim()) assert.equal(row.name_en, original.name_en, 'Existing English name changed');
      }
    }
    for (const group of snapshot.filter_options) {
      const rows = await db.collection(catalogs[group.key].Model.collection.name).find({ value: { $in: group.values.map(item => item.key) } }).toArray();
      assert.equal(rows.length, group.values.length);
      assert.ok(rows.every(row => typeof row.name_en === 'string' && row.name_en.trim()));
    }
    report.verified = true;
  }
  await fs.writeFile(path.join(directory, apply ? 'gamebrain-english-names-result.json' : 'gamebrain-english-names-preview.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());

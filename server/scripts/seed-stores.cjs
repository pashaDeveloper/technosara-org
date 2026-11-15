const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const Store = require('../models/store.model');
const data = require('../data/stores.json');

async function main() {
  const apply = process.argv.includes('--apply');
  const expected = process.argv.find(arg => arg.startsWith('--expected-db='))?.slice(14);
  assert.ok(expected, 'Pass --expected-db to identify the target database');
  await mongoose.connect(process.env.MONGO_URI || process.env.ATLAS_URI, {
    ...(process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {}), serverSelectionTimeoutMS: 10000,
  });
  assert.equal(mongoose.connection.name, expected);
  const db = mongoose.connection.db;
  const creators = await db.collection('genres').distinct('creator', { isDeleted: { $ne: true }, creator: { $ne: null } });
  assert.equal(creators.length, 1, 'Expected one existing catalog creator');
  const creator = creators[0];
  assert.ok(await db.collection('admins').findOne({ _id: creator, isDeleted: { $ne: true } }), 'Catalog creator must exist');
  const before = await Store.find().setOptions({ withDeleted: true }).lean();
  const codes = new Set(before.map(row => row.code));
  let order = Math.max(-1, ...before.map(row => row.sort_order || 0)) + 1;
  const docs = [];
  for (const entry of data) {
    if (codes.has(entry.code)) continue;
    codes.add(entry.code);
    const doc = new Store({ ...entry, creator, sort_order: order++, metadata: {
      sources: [entry.website_url], seeded_at: '2026-09-25',
    } });
    await doc.validate();
    docs.push(doc);
  }
  const directory = path.resolve(__dirname, '../../reports');
  await fs.mkdir(directory, { recursive: true });
  const summary = { applied: apply, database: expected, created: docs.length, skipped: data.length - docs.length, codes: docs.map(doc => doc.code) };
  if (apply) {
    summary.backup = path.join(directory, 'stores-before-' + Date.now() + '.json');
    await fs.writeFile(summary.backup, mongoose.mongo.BSON.EJSON.stringify(before, { relaxed: false }));
    await Store.init();
    for (const doc of docs) await doc.save();
    for (const doc of docs) {
      const saved = await Store.findById(doc._id).lean();
      for (const field of ['code', 'name', 'name_en', 'description', 'website_url', 'sort_order', 'is_active']) assert.deepEqual(saved[field], doc[field]);
      assert.equal(String(saved.creator), String(creator));
    }
  }
  summary.verified = apply;
  await fs.writeFile(path.join(directory, apply ? 'stores-result.json' : 'stores-preview.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());

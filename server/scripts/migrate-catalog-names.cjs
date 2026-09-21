const path = require('node:path');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const { personNames, companyNames, genreNames } = require('../utils/catalogNames');

async function main() {
  if (process.env.DB_NAME !== 'technosara') throw new Error('Expected DB_NAME=technosara');
  const client = new mongoose.mongo.MongoClient(process.env.MONGO_URI || process.env.ATLAS_URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const session = client.startSession();
  const apply = process.argv.includes('--apply');
  const db = client.db('technosara');
  const reportDir = path.join(__dirname, '../../reports');
  await fs.mkdir(reportDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  let summary;
  try {
    await session.withTransaction(async () => {
      const before = {};
      for (const key of ['people', 'companies', 'genres']) before[key] = await db.collection(key).find({}, { session }).toArray();
      const names = new Map(before.people.map(person => [String(person._id), personNames(person).name]));
      const plans = {};
      for (const [key, transform, unset] of [
        ['people', personNames, { english_name: '', name_en: '' }],
        ['companies', companyNames, { english_name: '', name_fa: '', name_en: '' }],
        ['genres', genreNames, { name_fa: '', english_name: '' }],
      ]) {
        plans[key] = before[key].map(record => {
          const set = transform(record);
          if (key === 'companies') for (const field of ['founders', 'key_members']) {
            set[field] = (record[field] || []).map(item => ({ ...item, name: names.get(String(item.person_id)) || item.name }));
          }
          return { updateOne: { filter: { _id: record._id }, update: { $set: set, $unset: unset } } };
        });
      }
      summary = { database: db.databaseName, applied: apply, counts: Object.fromEntries(Object.entries(plans).map(([key, rows]) => [key, rows.length])) };
      if (!apply) return;
      await fs.writeFile(path.join(reportDir, `names-before-${stamp}.json`), mongoose.mongo.BSON.EJSON.stringify(before, { relaxed: false }));
      for (const key of Object.keys(plans)) {
        if (plans[key].length) await db.collection(key).bulkWrite(plans[key], { session });
        for (const { updateOne: operation } of plans[key]) {
          const record = await db.collection(key).findOne(operation.filter, { session });
          for (const [field, value] of Object.entries(operation.update.$set)) assert.deepEqual(record[field], value);
          for (const field of Object.keys(operation.update.$unset)) assert.equal(Object.hasOwn(record, field), false);
        }
      }
    });
    await fs.writeFile(path.join(reportDir, apply ? 'names-migration-result.json' : 'names-migration-preview.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } finally { await session.endSession(); await client.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

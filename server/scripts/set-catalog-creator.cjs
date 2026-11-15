const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });

async function main() {
  assert.equal(process.env.DB_NAME, 'technosara');
  const creator = new mongoose.Types.ObjectId('6aafdc92db4c30c55f369c5b');
  const apply = process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGO_URI || process.env.ATLAS_URI, { dbName: 'technosara', serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  const session = await mongoose.startSession();
  const directory = path.resolve(__dirname, '../../reports');
  await fs.mkdir(directory, { recursive: true });
  let summary;
  try {
    await session.withTransaction(async () => {
      assert.ok(await db.collection('admins').findOne({ _id: creator, isDeleted: { $ne: true } }, { session }), 'Target admin does not exist or is deleted');
      const before = {};
      for (const name of ['brands', 'platforms', 'companies', 'people', 'genres']) {
        before[name] = await db.collection(name).find({}, { session, projection: { _id: 1, creator: 1, updatedAt: 1 } }).toArray();
      }
      summary = { applied: apply, creator: String(creator), collections: {} };
      if (apply) {
        summary.backup = path.join(directory, `catalog-creator-before-${Date.now()}.json`);
        await fs.writeFile(summary.backup, mongoose.mongo.BSON.EJSON.stringify(before, { relaxed: false }));
      }
      for (const [name, rows] of Object.entries(before)) {
        const changed = rows.filter(r => String(r.creator) !== String(creator)).length;
        if (apply) {
          const result = await db.collection(name).updateMany({ creator: { $ne: creator } }, { $set: { creator, updatedAt: new Date() } }, { session });
          assert.equal(result.modifiedCount, changed);
          assert.equal(await db.collection(name).countDocuments({ creator: { $ne: creator } }, { session }), 0);
          assert.equal(await db.collection(name).countDocuments({}, { session }), rows.length);
        }
        summary.collections[name] = { total: rows.length, changed };
      }
      summary.verified = apply;
    });
    await fs.writeFile(path.join(directory, apply ? 'catalog-creator-result.json' : 'catalog-creator-preview.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } finally { await session.endSession(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());

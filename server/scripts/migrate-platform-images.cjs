const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true, quiet: true });

async function main() {
  const expected = process.argv.find(arg => arg.startsWith('--expected-db='))?.slice(14);
  assert.ok(expected, 'Specify --expected-db');
  await mongoose.connect(process.env.MONGO_URI || process.env.ATLAS_URI, {
    ...(process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {}), serverSelectionTimeoutMS: 10000,
  });
  try {
    assert.equal(mongoose.connection.name, expected);
    const collection = mongoose.connection.db.collection('platforms');
    const rows = await collection.find({}).sort({ _id: 1 }).toArray();
    const changes = rows.filter(row => ['preview_url', 'image_storage', 'icon', 'image'].some(key => Object.hasOwn(row, key)));
    const report = { database: expected, applied: process.argv.includes('--apply'), total: rows.length, changed: changes.length };
    const folder = path.join(__dirname, '../../reports');
    await fs.mkdir(folder, { recursive: true });
    if (report.applied && changes.length) {
      report.backup = path.join(folder, `platform-images-before-${Date.now()}.ejson`);
      await fs.writeFile(report.backup, mongoose.mongo.BSON.EJSON.stringify(rows, { relaxed: false }), { flag: 'wx' });
      const result = await collection.bulkWrite(changes.map(row => ({ updateOne: {
        filter: { _id: row._id, logo: Object.hasOwn(row, 'logo') ? row.logo : { $exists: false }, ...(row.updatedAt ? { updatedAt: row.updatedAt } : {}) },
        update: { $set: { thumbnail: row.thumbnail || row.preview_url || row.image || null }, $unset: { preview_url: '', image_storage: '', icon: '', image: '' } },
      } })));
      assert.equal(result.matchedCount, changes.length, 'A platform changed during migration; inspect backup');
      const after = await collection.find({}).sort({ _id: 1 }).toArray();
      const expectedRows = rows.map(row => {
        if (!changes.some(changed => changed._id.equals(row._id))) return row;
        const { preview_url, image_storage, icon, image, ...rest } = row;
        return { ...rest, thumbnail: row.thumbnail || preview_url || image || null };
      });
      assert.deepEqual(after, expectedRows);
      report.verified = true;
    }
    await fs.writeFile(path.join(folder, 'platform-images-result.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally { await mongoose.disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

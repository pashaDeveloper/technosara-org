const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const Brand = require('../models/brand.model');
const data = require('../data/brand-details.json');

async function main() {
  assert.equal(process.env.DB_NAME, 'technosara');
  await mongoose.connect(process.env.MONGO_URI || process.env.ATLAS_URI, { dbName: 'technosara', serverSelectionTimeoutMS: 15000 });
  const apply = process.argv.includes('--apply');
  const session = await mongoose.startSession();
  const directory = path.resolve(__dirname, '../../reports');
  await fs.mkdir(directory, { recursive: true });
  let summary;
  try {
    await session.withTransaction(async () => {
      const brands = await Brand.collection.find({}, { session }).toArray();
      const platforms = await mongoose.connection.collection('platforms').find({}, { session }).toArray();
      const changes = [];
      for (const [oldSlug, slug] of [['sony', 'playstation'], ['microsoft', 'xbox']]) {
        const old = brands.find(b => b.slug === oldSlug);
        const existing = brands.find(b => b.slug === slug);
        if (!old && existing && !existing.isDeleted) continue;
        assert.ok(old && !old.isDeleted, 'Missing active brand: ' + oldSlug);
        assert.ok(!existing, 'Conflicting target brand: ' + slug);
        const linked = platforms.filter(p => String(p.brand_id) === String(old._id));
        assert.ok(linked.every(p => slug === 'xbox' ? /^Xbox /i.test(p.name) : /^(PlayStation|PS[345])/i.test(p.name)), 'Unexpected platform linkage');
        const { founderSlugs, ...values } = data.brands.find(b => b.slug === slug);
        Object.assign(values, { founders: [], logo: '', preview_url: '', image_storage: null });
        await new Brand({ ...old, ...values }).validate();
        changes.push({ old, values, platforms: linked.map(p => p.name) });
      }
      summary = { applied: apply, brands: changes.map(c => ({ from: c.old.slug, to: c.values.slug, creator: c.old.creator ?? null, platforms: c.platforms })) };
      if (!apply) return;
      const backup = path.join(directory, `console-brands-before-${Date.now()}.json`);
      await fs.writeFile(backup, mongoose.mongo.BSON.EJSON.stringify({ brands, platforms }, { relaxed: false }));
      for (const change of changes) {
        await Brand.collection.updateOne({ _id: change.old._id }, { $set: { ...change.values, updatedAt: new Date() } }, { session });
        const after = await Brand.collection.findOne({ _id: change.old._id }, { session });
        for (const [key, value] of Object.entries(change.values)) assert.deepEqual(after[key], value);
        assert.deepEqual(after.creator, change.old.creator);
      }
      assert.deepEqual(await mongoose.connection.collection('platforms').find({}, { session }).toArray(), platforms);
      summary.backup = backup;
      summary.verified = true;
    });
    await fs.writeFile(path.join(directory, 'console-brands-result.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } finally { await session.endSession(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());

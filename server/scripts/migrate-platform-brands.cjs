const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const Brand = require('../models/brand.model');
const Platform = require('../models/platform.model');
const data = require('../data/gaming-catalog');
async function main() {
  if (process.env.DB_NAME !== 'technosara') throw new Error('Expected technosara');
  await mongoose.connect(process.env.MONGO_URI || process.env.ATLAS_URI, { dbName: 'technosara', serverSelectionTimeoutMS: 15000 });
  await Brand.init();
  const session = await mongoose.startSession();
  const apply = process.argv.includes('--apply');
  let summary;
  try {
    await session.withTransaction(async () => {
      const before = { platforms: await Platform.collection.find({}, { session }).toArray(), brands: await Brand.collection.find({}, { session }).toArray() };
      const brands = new Map(before.brands.map(row => [row.slug, row]));
      const newBrands = [];
      for (const row of data.brands) {
        if (brands.get(row.slug)?.isDeleted) throw new Error('Deleted brand: ' + row.slug);
        if (!brands.has(row.slug)) { const record = new Brand(row); await record.validate(); const plain = record.toObject(); brands.set(row.slug, plain); newBrands.push(plain); }
      }
      const seed = new Map(data.platforms.map(row => [row.slug, row]));
      const plans = before.platforms.map(row => {
        const source = seed.get(row.slug || row.code);
        const name = row.english_name || row.name_english || row.name;
        if (!name || /[\u0600-\u06ff]/.test(name)) throw new Error('Missing English platform name: ' + row.slug);
        const brand_id = row.brand_id || brands.get(source?.brandSlug)?._id;
        if (!brand_id) throw new Error('Unmapped platform brand: ' + row.slug);
        return { updateOne: { filter: { _id: row._id }, update: { $set: { name, brand_id }, $unset: { english_name: '', name_english: '', name_en: '', name_fa: '', manufacturer_id: '' } } } };
      });
      const parent = before.platforms.find(row => row.slug === 'playstation-4' || row.code === 'playstation-4');
      if (!parent || parent.isDeleted) throw new Error('Active PS4 parent missing');
      const children = [];
      for (const row of data.platforms.filter(row => row.parentSlug === 'playstation-4')) {
        const existing = before.platforms.find(p => p.slug === row.slug || p.code === row.code);
        if (existing) {
          if (existing.isDeleted || String(existing.parent_id) !== String(parent._id)) throw new Error('Conflicting child: ' + row.slug);
          continue;
        }
        const { brandSlug, parentSlug, ...values } = row;
        const record = new Platform({ ...values, parent_id: parent._id, brand_id: brands.get(brandSlug)._id });
        await record.validate(); children.push(record.toObject());
      }
      summary = { applied: apply, database: mongoose.connection.name, updatedPlatforms: plans.length, createdBrands: newBrands.length, createdChildren: children.map(c => c.name) };
      if (!apply) return;
      const directory = path.join(__dirname, '../../reports');
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(path.join(directory, `platform-brands-before-${Date.now()}.json`), mongoose.mongo.BSON.EJSON.stringify(before, { relaxed: false }));
      if (newBrands.length) await Brand.collection.insertMany(newBrands, { session });
      if (plans.length) await Platform.collection.bulkWrite(plans, { session });
      if (children.length) await Platform.collection.insertMany(children, { session });
      const after = await Platform.collection.find({}, { session }).toArray();
      for (const p of after) {
        assert.ok(p.name && !/[\u0600-\u06ff]/.test(p.name));
        for (const key of ['english_name', 'name_english', 'manufacturer_id']) assert.equal(Object.hasOwn(p, key), false);
        assert.ok(await Brand.collection.findOne({ _id: p.brand_id }, { session }));
      }
      for (const c of children) assert.equal(String(after.find(p => p.slug === c.slug).parent_id), String(parent._id));
      summary.verifiedPlatforms = after.length;
    });
    if (apply) await fs.writeFile(path.join(__dirname, '../../reports/platform-brands-result.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } finally { await session.endSession(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());

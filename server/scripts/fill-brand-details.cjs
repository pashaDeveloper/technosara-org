const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const Brand = require('../models/brand.model');
const Person = require('../models/person.model');
const data = require('../data/gaming-catalog');

async function main() {
  assert.equal(process.env.DB_NAME, 'technosara', 'Unexpected database');
  await mongoose.connect(process.env.MONGO_URI || process.env.ATLAS_URI, { dbName: 'technosara', serverSelectionTimeoutMS: 15000 });
  const apply = process.argv.includes('--apply');
  const session = await mongoose.startSession();
  const reportDir = path.resolve(__dirname, '../../reports');
  await fs.mkdir(reportDir, { recursive: true });
  let summary;
  try {
    await session.withTransaction(async () => {
      const slugs = data.brands.map(b => b.slug);
      const founderSlugs = [...new Set(data.brands.flatMap(b => b.founderSlugs))];
      const brands = await Brand.find({ slug: { $in: slugs } }).setOptions({ withDeleted: true }).session(session);
      const people = await Person.find({ slug: { $in: founderSlugs } }).setOptions({ withDeleted: true }).session(session);
      assert.equal(brands.length, 3, 'Expected all three existing brands');
      assert.ok([...brands, ...people].every(r => !r.isDeleted), 'Deleted record found');
      const before = { brands: brands.map(r => r.toObject()), people: people.map(r => r.toObject()) };
      const peopleBySlug = new Map(people.map(p => [p.slug, p]));
      const created = [];
      for (const slug of founderSlugs) {
        if (peopleBySlug.has(slug)) continue;
        const source = data.people.find(p => p.slug === slug);
        assert.ok(source, 'Missing founder source: ' + slug);
        const person = new Person(source);
        await person.validate();
        created.push(person);
        peopleBySlug.set(slug, person);
      }
      const expected = new Map();
      for (const source of data.brands) {
        const { founderSlugs, ...values } = source;
        values.founders = founderSlugs.map(slug => {
          const p = peopleBySlug.get(slug);
          return { person_id: p._id, name: p.name };
        });
        const brand = brands.find(b => b.slug === source.slug);
        brand.set(values);
        await brand.validate();
        expected.set(source.slug, values);
      }
      summary = { applied: apply, database: mongoose.connection.name, brands: slugs, createdPeople: created.map(p => p.slug) };
      if (!apply) return;
      const backup = path.join(reportDir, `brand-details-before-${Date.now()}.json`);
      await fs.writeFile(backup, mongoose.mongo.BSON.EJSON.stringify({ ...before, createdPersonIds: created.map(p => p._id) }, { relaxed: false }));
      for (const person of created) await person.save({ session });
      for (const brand of brands) await brand.save({ session });
      const after = await Brand.find({ slug: { $in: slugs } }).session(session).lean();
      for (const brand of after) {
        for (const [field, value] of Object.entries(expected.get(brand.slug))) {
          assert.equal(JSON.stringify(brand[field]), JSON.stringify(value), `${brand.slug}: ${field} mismatch`);
        }
        for (const founder of brand.founders) assert.ok(await Person.findById(founder.person_id).session(session));
        const original = before.brands.find(b => b.slug === brand.slug);
        assert.equal(String(brand._id), String(original._id));
        assert.equal(brand.logo, original.logo);
      }
      summary.verified = after.length;
      summary.backup = backup;
    });
    await fs.writeFile(path.join(reportDir, apply ? 'brand-details-result.json' : 'brand-details-preview.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } finally { await session.endSession(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());

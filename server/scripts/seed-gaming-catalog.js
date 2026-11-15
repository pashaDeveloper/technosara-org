const path = require('path');
const fs = require('fs/promises');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const data = require('../data/gaming-catalog');

async function main() {
  const apply = process.argv.includes('--apply');
  const groups = (process.argv.find(arg => arg.startsWith('--groups='))?.slice(9) || 'genres,people,companies,brands,platforms').split(',');
  if (!groups.length || groups.some(key => !['genres', 'people', 'companies', 'brands', 'platforms'].includes(key))) throw new Error('Invalid catalog groups');
  const expectedDb = process.argv.find(arg => arg.startsWith('--expected-db='))?.slice(14);
  await mongoose.connect(process.env.MONGO_URI || process.env.ATLAS_URI || 'mongodb://127.0.0.1:27017/technosara', { ...(process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {}), serverSelectionTimeoutMS: 5000 });
  if (expectedDb && mongoose.connection.name !== expectedDb) throw new Error('Database does not match --expected-db');
  const models = Object.fromEntries([['genres', 'genre'], ['people', 'person'], ['companies', 'company'], ['brands', 'brand'], ['platforms', 'platform']].map(([key, name]) => [key, require(`../models/${name}.model`)]));
  const directory = path.resolve(__dirname, '../../reports');
  await fs.mkdir(directory, { recursive: true });
  const before = {};
  for (const [key, Model] of Object.entries(models)) if (groups.includes(key)) before[key] = await Model.find().setOptions({ withDeleted: true }).lean();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (apply) await fs.writeFile(path.join(directory, `catalog-before-${stamp}.json`), JSON.stringify(before, null, 2));
  const summary = { applied: apply, database: mongoose.connection.name, created: {}, skipped: {} };
  const ids = { people: new Map(), companies: new Map(), brands: new Map(), platforms: new Map() };
  for (const key of ['people', 'companies', 'brands', 'platforms']) {
    for (const record of await models[key].find().setOptions({ withDeleted: true })) ids[key].set(record.slug, record);
  }
  for (const key of ['genres', 'people', 'companies', 'brands', 'platforms']) {
    if (!groups.includes(key)) continue;
    summary.created[key] = 0; summary.skipped[key] = 0;
    for (const entry of data[key]) {
      const { founderSlugs = [], memberSlugs = [], brandSlug, parentSlug, ...values } = entry;
      const Model = models[key];
      const existing = await Model.findOne({ slug: values.slug }).setOptions({ withDeleted: true });
      if (existing) { summary.skipped[key]++; ids[key]?.set(values.slug, existing); continue; }
      if (key === 'companies' || key === 'brands') {
        values.founded_year = values.founded_date ? Number(values.founded_date.slice(0, 4)) : values.founded_year;
        for (const slug of [...founderSlugs, ...memberSlugs.map(([slug]) => slug)]) {
          if (!ids.people.has(slug) || ids.people.get(slug).isDeleted) throw new Error(`Missing active person: ${slug}`);
        }
        values.founders = founderSlugs.map(slug => ({ person_id: ids.people.get(slug)._id, name: ids.people.get(slug).name }));
        if (key === 'companies') values.key_members = memberSlugs.map(([slug, role]) => ({ person_id: ids.people.get(slug)._id, name: ids.people.get(slug).name, role }));
      }
      if (key === 'platforms') {
        if (!ids.brands.get(brandSlug)) throw new Error('Missing brand: ' + brandSlug);
        values.brand_id = ids.brands.get(brandSlug)._id;
        if (parentSlug) {
          if (!ids.platforms.get(parentSlug)) throw new Error('Missing parent: ' + parentSlug);
          values.parent_id = ids.platforms.get(parentSlug)._id;
        }
      }
      const record = new Model(values);
      await record.validate();
      if (apply) await record.save();
      ids[key]?.set(values.slug, record);
      summary.created[key]++;
    }
  }
  await fs.writeFile(path.join(directory, apply ? 'catalog-import-result.json' : 'catalog-import-preview.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());

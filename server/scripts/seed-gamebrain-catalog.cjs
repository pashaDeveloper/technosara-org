const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { catalogs, identityField, slug, candidate } = require('../utils/gameRelations');
const { generateSlug } = require('../utils/slug');
const Filter = require('../models/filterOption.model');
const SortOption = require('../models/sortingOption.model');
const api = require('../services/gamebrain.service');
const reportDir = path.resolve(__dirname, '../../reports');
const dataDir = path.resolve(__dirname, '../data/gamebrain');

async function planCatalog(Model, rows, options, creator) {
  const operations = [], summary = { total: options.length, created: 0, mapped: 0, unchanged: 0, english_filled: 0 };
  const planned = rows.map(row => ({ ...row }));
  for (const option of options) {
    assert.ok(typeof option.key === 'string' && option.key.trim() && typeof option.name === 'string' && option.name.trim(), 'Invalid API catalog entry');
    const existing = candidate(planned, option, Model);
    if (existing?.isDeleted) throw new Error(`Deleted ${Model.modelName} conflicts with API key ${option.key}`);
    if (existing) {
      const values = { value: option.key, name: option.name };
      if (Model.schema.path('name_en')) values.name_en = option.name;
      if (Object.entries(values).every(([key, value]) => existing[key] === value)) { summary.unchanged++; continue; }
      if (!existing.name_en) summary.english_filled++;
      operations.push({ updateOne: { filter: { _id: existing._id, value: existing.value || { $exists: false } }, update: { $set: values } } });
      Object.assign(existing, values);
      summary.mapped++;
    } else {
      const name_en = option.name;
      const identity = identityField(Model) === 'slug' ? generateSlug(name_en) : slug(option.key);
      assert.ok(identity, 'Empty API identity');
      const fields = { name: option.name, value: option.key, [identityField(Model)]: identity, creator };
      if (Model.schema.path('name_en')) fields.name_en = option.name;
      const doc = new Model(fields);
      await doc.validate();
      planned.push(doc.toObject());
      operations.push({ insertOne: { document: doc.toObject() } });
      summary.created++;
    }
  }
  return { operations, summary };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const expected = process.argv.find(arg => arg.startsWith('--expected-db='))?.slice(14);
  assert.ok(expected, 'Pass --expected-db to identify the target database');
  await mongoose.connect(process.env.MONGO_URI || process.env.ATLAS_URI, { ...(process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {}), serverSelectionTimeoutMS: 10000 });
  assert.equal(mongoose.connection.name, expected, 'Unexpected database');
  const db = mongoose.connection.db;
  const admins = await db.collection('admins').find({ status: 'active', isDeleted: { $ne: true }, role: { $in: ['superAdmin', 'admin'] } }, { projection: { _id: 1 } }).toArray();
  const creators = await db.collection('genres').distinct('creator', { isDeleted: { $ne: true }, creator: { $ne: null } });
  const creator = creators.find(id => admins.some(admin => String(admin._id) === String(id))) || (admins.length === 1 ? admins[0]._id : null);
  assert.ok(creator, 'Could not identify a catalog administrator');
  const data = process.argv.includes('--snapshot') ? JSON.parse(await fs.readFile(path.join(dataDir, 'filters.json'), 'utf8')) : await api.filters();
  assert.ok(Array.isArray(data.filter_options), 'API did not supply filters');
  const unknown = data.filter_options.filter(filter => !catalogs[filter.key]).map(filter => filter.key);
  assert.equal(unknown.length, 0, `Unmodeled API dependencies: ${unknown.join(', ')}`);
  const before = {}, plans = {};
  for (const filter of data.filter_options) {
    const { Model } = catalogs[filter.key];
    const rows = await Model.find({}).setOptions({ withDeleted: true }).lean();
    // Keep an untouched backup; the planning helper only mutates its own copy.
    before[Model.collection.name] = rows;
    plans[filter.key] = await planCatalog(Model, rows.map(row => ({ ...row })), filter.values, creator);
  }
  before[Filter.collection.name] = await Filter.find({}).lean();
  before[SortOption.collection.name] = await SortOption.find({}).lean();
  for (const filter of data.filter_options) await new Filter(filter).validate();
  for (const option of data.sorting_options || []) await new SortOption(option).validate();
  const protectedCollections = ['games', 'achievements', 'achievement_groups', 'age_ratings', 'game_series'];
  const protectedCounts = Object.fromEntries(await Promise.all(protectedCollections.map(async name => [name, await db.collection(name).countDocuments()])));
  const summary = { applied: apply, database: expected, fetched_at: new Date().toISOString(), groups: Object.fromEntries(Object.entries(plans).map(([key, value]) => [key, value.summary])), sorting_options: data.sorting_options?.length || 0 };
  await fs.mkdir(reportDir, { recursive: true });
  if (apply) {
    summary.backup = path.join(reportDir, `gamebrain-catalog-before-${Date.now()}.ejson`);
    await fs.writeFile(summary.backup, mongoose.mongo.BSON.EJSON.stringify(before, { relaxed: false }));
    const allModels = [...Object.values(catalogs).map(value => value.Model), Filter, SortOption];
    for (const Model of allModels) await Model.init();
    const session = await mongoose.startSession();
    try {
      for (const filter of data.filter_options) {
        const { Model } = catalogs[filter.key];
        const operations = plans[filter.key].operations;
        await session.withTransaction(async () => {
          if (operations.length) {
            const result = await Model.bulkWrite(operations, { session, ordered: true });
            assert.equal(result.matchedCount, plans[filter.key].summary.mapped, 'Catalog changed after planning; rerun');
          }
          await Filter.updateOne({ key: filter.key }, { $set: { name: filter.name, filter_type: filter.filter_type, filter_connection: filter.filter_connection, values: filter.values } }, { session, upsert: true, runValidators: true });
        });
      }
      await session.withTransaction(async () => {
        for (const option of data.sorting_options || []) await SortOption.updateOne({ key: option.key }, { $set: { name: option.name, sort: option.sort } }, { session, upsert: true, runValidators: true });
      });
    } finally { await session.endSession(); }
    for (const filter of data.filter_options) {
      const { Model } = catalogs[filter.key];
      const rows = await Model.find({ value: { $in: filter.values.map(value => value.key) } }).lean();
      assert.equal(rows.length, filter.values.length, `Incomplete ${filter.key}`);
      for (const option of filter.values) {
        const row = rows.find(item => item.value === option.key);
        assert.equal(row.name, option.name); assert.equal(row.value, option.key);
      }
      const stored = await Filter.findOne({ key: filter.key }).lean();
      assert.equal(stored.values.length, filter.values.length);
      const originals = before[Model.collection.name];
      for (const original of originals) {
        const after = await db.collection(Model.collection.name).findOne({ _id: original._id });
        assert.ok(after, 'Existing catalog record removed');
        for (const [key, value] of Object.entries(original)) {
          if (['updatedAt', 'value', '__v', 'name', 'name_en', 'name_fa', 'key', 'value'].includes(key)) continue;
          assert.deepEqual(after[key], value, `Existing ${Model.modelName}.${key} changed`);
        }
        if (/[\u0600-\u06ff]/.test(original.name || '')) assert.equal(after.name_fa, original.name);
      }
    }
    for (const name of protectedCollections) assert.equal(await db.collection(name).countDocuments(), protectedCounts[name], `Unexpected changes to ${name}`);
    summary.verified = true;
    summary.protected_counts = protectedCounts;
    await fs.writeFile(path.join(dataDir, 'filters.json'), JSON.stringify({ source: 'https://api.gamebrain.co/v1/games?query=&limit=1&generate-filter-options=true', fetched_at: summary.fetched_at, ...data }, null, 2) + '\n');
  }
  await fs.writeFile(path.join(reportDir, apply ? 'gamebrain-catalog-result.json' : 'gamebrain-catalog-preview.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
module.exports = { planCatalog };

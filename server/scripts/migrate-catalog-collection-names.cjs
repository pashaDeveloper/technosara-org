const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const mongoose = require('mongoose');

const renames = [
  ['theme', 'game_themes', 'themes'],
  ['inputMode', 'game_input_modes', 'input_modes'],
  ['releaseWindow', 'game_release_windows', 'release_windows'],
  ['priceRange', 'game_price_ranges', 'price_ranges'],
  ['contentRating', 'game_age_categories', 'content_ratings'],
  ['reviewRating', 'game_review_ratings', 'review_ratings'],
  ['news', 'game_news', 'news'],
  ['filterOption', 'gamebrain_filters', 'filter_options'],
  ['sortingOption', 'gamebrain_sort_options', 'sorting_options'],
  ['tag', 'gametags', 'game_tags'],
];
const serialize = value => mongoose.mongo.BSON.EJSON.stringify(value, { relaxed: false });
const digest = value => createHash('sha256').update(serialize(value)).digest('hex');

async function snapshot(db, name, names) {
  if (!names.has(name)) return null;
  return { documents: await db.collection(name).find({}).sort({ _id: 1 }).toArray(), indexes: await db.collection(name).indexes() };
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true, quiet: true });
  const apply = process.argv.includes('--apply');
  const expected = process.argv.find(arg => arg.startsWith('--expected-db='))?.slice(14);
  assert.ok(expected, 'Specify --expected-db to identify the intended database');
  await mongoose.connect(process.env.MONGO_URI || process.env.ATLAS_URI || 'mongodb://127.0.0.1:27017/technosara', {
    ...(process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {}),
    serverSelectionTimeoutMS: 10000, autoIndex: false, autoCreate: false,
  });
  try {
    assert.equal(mongoose.connection.name, expected, 'Unexpected database');
    const db = mongoose.connection.db;
    const names = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(item => item.name));
    const backup = {}, plan = [];
    for (const [file, from, to] of renames) {
      const Model = require(`../models/${file}.model`);
      assert.equal(Model.collection.name, to);
      const source = await snapshot(db, from, names), target = await snapshot(db, to, names);
      if (source) backup[from] = source;
      if (target) backup[to] = target;
      assert.ok(!(source?.documents.length && target?.documents.length), `Both ${from} and ${to} contain records; refusing to overwrite either collection`);
      const action = !source ? 'unchanged' : target?.documents.length ? 'drop_empty_legacy' : 'rename';
      plan.push({ model: Model.modelName, from, to, source_count: source?.documents.length || 0, target_count: target?.documents.length || 0, action });
    }
    const report = { applied: apply, database: expected, checked_at: new Date().toISOString(), collections: plan };
    const reportDir = path.join(__dirname, '../../reports');
    await fs.mkdir(reportDir, { recursive: true });
    if (apply) {
      report.backup = path.join(reportDir, `catalog-collection-names-before-${Date.now()}.ejson`);
      await fs.writeFile(report.backup, serialize(backup), { flag: 'wx' });
      for (const item of plan) {
        if (item.action === 'unchanged') continue;
        // Guard against a writer changing the source or destination after planning.
        const current = await db.collection(item.from).find({}).sort({ _id: 1 }).toArray();
        assert.equal(digest(current), digest(backup[item.from].documents), `Source changed: ${item.from}`);
        const count = await db.collection(item.to).countDocuments();
        if (item.action === 'drop_empty_legacy') {
          assert.equal(count, item.target_count);
          await db.collection(item.from).drop();
          continue;
        }
        assert.equal(count, 0, `Target now contains records: ${item.to}`);
        await db.collection(item.from).rename(item.to, { dropTarget: true });
        const after = await db.collection(item.to).find({}).sort({ _id: 1 }).toArray();
        assert.equal(digest(after), digest(backup[item.from].documents), `Document mismatch: ${item.to}`);
        const indexSignature = indexes => indexes.map(({ ns, ...index }) => index).sort((a, b) => a.name.localeCompare(b.name));
        assert.deepEqual(indexSignature(await db.collection(item.to).indexes()), indexSignature(backup[item.from].indexes));
      }
      report.verified = true;
    }
    await fs.writeFile(path.join(reportDir, apply ? 'catalog-collection-names-result.json' : 'catalog-collection-names-preview.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally { await mongoose.disconnect(); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { renames };

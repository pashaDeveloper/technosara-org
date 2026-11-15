const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const translations = require('../data/persian-classifications.json');
const persian = value => /[\u0600-\u06ff]/.test(value || '');
async function main() {
  const apply = process.argv.includes('--apply');
  const expected = process.argv.find(arg => arg.startsWith('--expected-db='))?.slice(14);
  if (!expected) throw new Error('Pass --expected-db');
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.ATLAS_URI, {
      ...(process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {}), serverSelectionTimeoutMS: 10000,
    });
    if (mongoose.connection.name !== expected) throw new Error('Unexpected database');
    const plans = [], backup = {};
    for (const [group, file] of [['themes', 'theme'], ['genres', 'genre']]) {
      const Model = require(`../models/${file}.model`);
      const rows = await Model.find().lean();
      backup[group] = rows;
      const operations = [];
      for (const row of rows) {
        if (persian(row.name)) continue;
        const english = row.name_en || row.name;
        const name = translations[group][english] || translations[group][row.name];
        if (!persian(name)) throw new Error(`Missing translation: ${group}/${english}`);
        operations.push({ updateOne: { filter: { _id: row._id, name: row.name }, update: { $set: { name, name_en: english } } } });
      }
      plans.push({ group, Model, operations, count: rows.length });
    }
    if (apply && plans.some(plan => plan.operations.length)) {
      const directory = path.join(__dirname, '../../reports');
      await fs.mkdir(directory, { recursive: true });
      const target = path.join(directory, `persian-classifications-before-${Date.now()}.ejson`);
      await fs.writeFile(target, mongoose.mongo.BSON.EJSON.stringify(backup, { relaxed: false }));
      for (const plan of plans) if (plan.operations.length) await plan.Model.bulkWrite(plan.operations);
    }
    for (const plan of plans) {
      const remaining = (await plan.Model.find().select('name').lean()).filter(row => !persian(row.name)).length;
      if (apply && remaining) throw new Error(`Untranslated ${plan.group}: ${remaining}`);
      console.log(JSON.stringify({ group: plan.group, total: plan.count, updated: apply ? plan.operations.length : 0, planned: plan.operations.length, missingPersian: remaining }));
    }
  } finally { await mongoose.disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

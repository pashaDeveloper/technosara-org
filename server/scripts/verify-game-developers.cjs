const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const data = require('../data/game-developers.json');
const Person = require('../models/person.model');
const Company = require('../models/company.model');

async function main() {
  if (process.env.DB_NAME !== 'technosara') throw new Error('Expected DB_NAME=technosara');
  await mongoose.connect(process.env.MONGO_URI || process.env.ATLAS_URI, {
    dbName: 'technosara', serverSelectionTimeoutMS: 15000,
  });
  const people = new Map();
  let links = 0;
  for (const [group, Model] of [['people', Person], ['companies', Company]]) {
    for (const entry of data[group]) {
      const { sources, founderSlugs = [], memberSlugs = [], ...values } = entry;
      const records = await Model.find({ slug: entry.slug }).setOptions({ withDeleted: true }).lean();
      assert.equal(records.length, 1, `${entry.slug}: expected exactly one record`);
      const record = records[0];
      assert.equal(record.isDeleted, false, `${entry.slug}: deleted`);
      for (const [key, value] of Object.entries(values)) {
        assert.deepEqual(record[key], value, `${entry.slug}: ${key} mismatch`);
      }
      if (group === 'people') people.set(entry.slug, record);
      else {
        const expectedFounders = founderSlugs.map(slug => ({
          person_id: String(people.get(slug)._id), name: people.get(slug).name,
        }));
        const expectedMembers = memberSlugs.map(([slug, role]) => ({
          person_id: String(people.get(slug)._id), name: people.get(slug).name, role,
        }));
        const normalize = list => list.map(item => ({ ...item, person_id: String(item.person_id) }));
        assert.deepEqual(normalize(record.founders), expectedFounders, `${entry.slug}: founders mismatch`);
        assert.deepEqual(normalize(record.key_members), expectedMembers, `${entry.slug}: members mismatch`);
        links += expectedFounders.length + expectedMembers.length;
      }
    }
  }
  const result = {
    database: mongoose.connection.name,
    verifiedAt: new Date().toISOString(),
    verified: { people: data.people.length, companies: data.companies.length, personLinks: links },
    totals: { people: await Person.countDocuments(), companies: await Company.countDocuments() },
  };
  await fs.writeFile(path.join(__dirname, '../../reports/game-developers-verification.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());

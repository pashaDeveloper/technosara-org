const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const Platform = require('../models/platform.model');
const shortNames = {
  'Playstation 2': 'PS2', 'Playstation 3': 'PS3', 'Playstation 4': 'PS4', 'Playstation 5': 'PS5',
  'Playstation Portable': 'PSP', 'Playstation Vita': 'PS Vita',
  'PlayStation VR': 'PS VR', 'Playstation VR2': 'PS VR2',
  'Nintendo 3DS': '3DS', 'Nintendo 64': 'N64', 'Nintendo DS': 'DS', 'Nintendo DSi': 'DSi',
  'Nintendo Gamecube': 'GCN', 'Gameboy': 'GB', 'Game Boy Advance': 'GBA', 'Super Nintendo': 'SNES',
  'Commodore C 64/128': 'C64/C128', 'Virtual Reality': 'VR', 'Windows Mixed Reality': 'WMR',
  'PC': 'PC', 'MS DOS': 'MS-DOS', 'Msx': 'MSX',
};

async function main() {
  const apply = process.argv.includes('--apply');
  const expected = process.argv.find(arg => arg.startsWith('--expected-db='))?.slice(14);
  if (!expected) throw new Error('Pass --expected-db');
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.ATLAS_URI, {
      ...(process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {}), serverSelectionTimeoutMS: 10000,
    });
    if (mongoose.connection.name !== expected) throw new Error('Unexpected database');
    const rows = await Platform.find().lean();
    const options = require('../data/gamebrain/filters.json').filter_options.find(item => item.key === 'platform').values;
    const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const operations = [];
    for (const option of options) {
      const exact = rows.filter(row => row.value === option.key);
      const matches = exact.length ? exact : rows.filter(row => normalize(row.name) === normalize(option.name));
      if (matches.length !== 1) throw new Error(`Missing or ambiguous platform: ${option.name}`);
      const row = matches[0];
      const shortName = Object.entries(shortNames).find(([name]) => normalize(name) === normalize(option.name))?.[1];
      const fields = {};
      if (!row.value) fields.value = option.key;
      if (!row.short_name && shortName) fields.short_name = shortName;
      if (Object.keys(fields).length) operations.push({ updateOne: { filter: { _id: row._id }, update: { $set: fields } } });
    }
    let backup;
    if (apply && operations.length) {
      const directory = path.join(__dirname, '../../reports');
      await fs.mkdir(directory, { recursive: true });
      backup = path.join(directory, `platform-short-names-before-${Date.now()}.ejson`);
      await fs.writeFile(backup, mongoose.mongo.BSON.EJSON.stringify(rows, { relaxed: false }));
      await Platform.bulkWrite(operations);
    }
    console.log(JSON.stringify({ applied: apply, checked: options.length, updated: operations.length, backup }));
  } finally { await mongoose.disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

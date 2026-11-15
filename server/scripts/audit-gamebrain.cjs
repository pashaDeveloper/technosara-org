// Read-only comparison of provider data, local schemas and persisted relations.
const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true, override: true });
const api = require('../services/gamebrain.service');
const { catalogs } = require('../utils/gameRelations');
const Game = require('../models/game.model');

async function main() {
  const report = { checked_at: new Date().toISOString(), read_only: true, catalogs: {}, games: [], issues: [] };
  const connectionDeadline = setTimeout(() => { console.error('Database connection timed out after 25 seconds'); process.exit(1); }, 25000);
  await mongoose.connect(process.env.MONGO_URI || process.env.ATLAS_URI || 'mongodb://127.0.0.1:27017/technosara', {
    ...(process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {}), serverSelectionTimeoutMS: 10000,
  });
  clearTimeout(connectionDeadline);
  try {
    report.database = mongoose.connection.name;
    console.log('Connected; reading live provider filters.');
    const filters = await api.filters();
    for (const filter of filters.filter_options || []) {
      const Model = catalogs[filter.key]?.Model;
      if (!Model) { report.issues.push({ type: 'unmapped_filter', key: filter.key }); continue; }
      const rows = await Model.find({}).lean();
      const missing = [], mismatched = [], duplicates = [];
      for (const item of filter.values) {
        const matches = rows.filter(row => row.value === item.key);
        if (!matches.length) missing.push(item);
        if (matches.length > 1) duplicates.push(item.key);
        for (const row of matches) if (row.name !== item.name || row.name_en !== item.name) mismatched.push({ key: item.key, expected: item.name, actual: row.name, name_en: row.name_en });
      }
      report.catalogs[filter.key] = { source_count: filter.values.length, local_count: rows.length, missing, mismatched, duplicates, local_only: rows.filter(row => !filter.values.some(item => item.key === row.value)).map(row => ({ id: row._id, value: row.value, name: row.name })) };
    }
    const games = await Game.find({}).lean();
    report.game_count = games.length;
    report.linked_game_count = games.filter(game => Number.isSafeInteger(game.id)).length;
    console.log(`Catalogs compared; ${games.length} local games, ${report.linked_game_count} linked to GameBrain.`);
    const { isDeepStrictEqual } = require('node:util');
    for (const game of games.filter(game => Number.isSafeInteger(game.id))) {
      console.log(`Comparing GameBrain ${game.id}`);
      const raw = await api.details(String(game.id));
      const mapped = api.mapGame(raw);
      const expected = new Game({ ...mapped.game, slug: game.slug, status: game.status }).toObject();
      const differences = [];
      for (const key of Object.keys(mapped.game)) {
        if (!Game.schema.path(key)) report.issues.push({ type: 'missing_schema_path', key });
        if (!isDeepStrictEqual(game[key], expected[key])) differences.push(key);
      }
      const relations = {};
      for (const [field, items] of Object.entries(mapped.references || {})) {
        const Model = field === 'developer_ids' ? require('../models/company.model') : field === 'platform_id' ? catalogs.platform.Model : field === 'game_tags' ? catalogs.tag.Model : field === 'genre_ids' ? catalogs.genre.Model : field === 'theme_ids' ? catalogs.theme.Model : catalogs.play_mode.Model;
        const rows = await Model.find({}).lean();
        const missing = [];
        for (const item of items) {
          const matches = rows.filter(row => field === 'developer_ids' ? [row.name, row.name_en].includes(item.name) : row.value === item.key);
          if (matches.length !== 1) { missing.push(item.key || item.name); continue; }
          const row = matches[0];
          let linked;
          if (field === 'platform_id') linked = await require('../models/gamePlatform.model').exists({ game_id: game._id, platform_id: row._id });
          else if (field === 'game_tags') linked = (row.game_ids || []).some(id => String(id) === String(game._id));
          else linked = (game[field] || []).some(id => String(id) === String(row._id));
          if (!linked) missing.push(item.key || item.name);
        }
        relations[field] = { expected: items.length, missing };
      }
      report.games.push({ local_id: game._id, source_id: game.id, name: game.name, differing_fields: differences, relations });
    }
    const destination = path.join(__dirname, '../../reports/gamebrain-audit.json');
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally { await mongoose.disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const service = require('../services/consoleDlc.service');
const Content = require('../models/gameContent.model');
async function main() {
  const input = { title: 'Grand Theft Auto V', official_stores: [
    { url: 'https://www.xbox.com/en-US/games/store/grand-theft-auto-v-premium-edition/C496CLVXMJP8' },
  ] };
  const list = await service.discoverDraft(input);
  console.log(JSON.stringify({ phase: 'discovered', counts: list.parents.map(row => ({ provider: row.provider, parent: row.app_id, count: row.count })), errors: list.errors }));
  const items = [], errors = [];
  for (const item of list.items) {
    try {
      const result = await service.previewOne({ ...input, provider: item.provider, app_id: item.app_id, parent_app_id: item.parent_app_id });
      await new Content({ ...result.content, game_id: new mongoose.Types.ObjectId() }).validate();
      items.push(result);
      console.log(JSON.stringify({ phase: 'detail', provider: item.provider, title: result.title, description: result.content.description.length, valid: true }));
    } catch (error) { errors.push({ ...item, error: error.message }); console.log(JSON.stringify({ phase: 'failed', provider: item.provider, id: item.app_id, error: error.message })); }
  }
  const directory = path.resolve(__dirname, '../../reports');
  await fs.mkdir(directory, { recursive: true });
  const report = { checked_at: new Date().toISOString(), database_writes: false, list, items, errors };
  await fs.writeFile(path.join(directory, 'console-dlc-gta-v.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ found: list.items.length, fetched: items.length, failed: errors.length, output: 'reports/console-dlc-gta-v.json' }));
  if (errors.length || list.errors.length) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

const fs = require('node:fs/promises');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const api = require('../services/gamebrain.service');
const directory = path.join(__dirname, '../data/gamebrain');

function catalogPreview(filters) {
  const values = key => filters.filter_options?.find(filter => filter.key === key)?.values || [];
  const entity = item => ({ name: item.name, value: item.key, slug: item.key.replace(/_/g, '-') });
  return {
    genres: values('genre').map(item => ({ external_key: item.key, fields: entity(item) })),
    play_modes: values('play_mode').map(item => ({ external_key: item.key, fields: entity(item) })),
    themes: values('theme').map(item => ({ external_key: item.key, fields: entity(item) })),
    tags: values('tag').map(item => ({ external_key: item.key, fields: entity(item) })),
    // device_type is required locally but is not supplied by GameBrain.
    platforms: values('platform').map(item => ({ external_key: item.key, fields: { name: item.name, value: item.key, code: item.key } })),
  };
}

async function writeDerived(filters, responses) {
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'catalog-preview.json'), JSON.stringify(catalogPreview(filters), null, 2) + '\n');
  if (responses.details?.status === 200) await fs.writeFile(path.join(directory, 'mapped-game.json'), JSON.stringify(api.mapGame(responses.details.body), null, 2) + '\n');
}

async function main() {
  if (process.argv.includes('--offline')) {
    await writeDerived(JSON.parse(await fs.readFile(path.join(directory, 'filters.json'), 'utf8')), JSON.parse(await fs.readFile(path.join(directory, 'responses.json'), 'utf8')));
    return;
  }
  const responses = {};
  // Sequential calls respect the provider's single-concurrent-request plans.
  const endpoints = [
    ['search', '/games?query=God%20of%20War&limit=2&generate-filter-options=true', () => api.search({ query: 'God of War', limit: '2', 'generate-filter-options': 'true' })],
    ['details', '/games/1273796', () => api.details('1273796')],
    ['suggestions', '/games/suggestions?query=god&limit=3', () => api.suggestions({ query: 'god', limit: '3' })],
    ['similar', '/games/1273796/similar', () => api.similar('1273796')],
    ['news', '/games/1273796/news?limit=2', () => api.news('1273796', { limit: '2' })],
  ];
  for (const [name, endpoint, action] of endpoints) {
    responses[name] = { path: endpoint, status: 200, fetched_at: new Date().toISOString(), body: await action() };
  }
  const data = await api.search({ query: '', limit: '1', 'generate-filter-options': 'true' });
  const filters = { source: 'https://api.gamebrain.co/v1/games?query=&limit=1&generate-filter-options=true', fetched_at: new Date().toISOString(), total_results: data.total_results, filter_options: data.filter_options, sorting_options: data.sorting_options };
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'responses.json'), JSON.stringify(responses, null, 2) + '\n');
  await fs.writeFile(path.join(directory, 'filters.json'), JSON.stringify(filters, null, 2) + '\n');
  await writeDerived(filters, responses);
  console.log('GameBrain snapshots and sparse catalog previews updated; no database writes.');
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { catalogPreview };

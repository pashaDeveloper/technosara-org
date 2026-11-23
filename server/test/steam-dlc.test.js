const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const service = require('../services/steamDlc.service');
const Game = require('../models/game.model');
const Product = require('../models/storeProduct.model');
const Content = require('../models/gameContent.model');
const Store = require('../models/store.model');
const id = () => new mongoose.Types.ObjectId();
const child = { steam_appid: 20, type: 'dlc', fullgame: { appid: '10' }, name: 'Expansion', detailed_description: '<p>Full description</p>', short_description: 'Summary', header_image: 'https://example.com/header.jpg', screenshots: [{ path_full: 'https://example.com/screenshot.jpg' }], movies: [{ mp4: { max: 'https://example.com/video.mp4' } }], developers: ['Developer'], publishers: ['Publisher'], supported_languages: 'English', pc_requirements: { minimum: 'Minimum' }, release_date: { coming_soon: false, date: 'Oct 12, 2015' }, price_overview: { final: 999, initial: 1999, currency: 'USD', discount_percent: 50 } };
const fetcher = rows => async url => {
  const parsed = new URL(url);
  const key = parsed.pathname.endsWith('/appdetails') ? parsed.searchParams.get('appids') : `list:${parsed.searchParams.get('appid')}`;
  const row = rows[key];
  return new Response(JSON.stringify(row), { status: row ? 200 : 503 });
};
function parentMocks(t, gameId, links = ['https://store.steampowered.com/app/10']) {
  t.mock.method(Game, 'findById', () => ({ lean: async () => ({ _id: gameId, official_stores: links.map(url => ({ url })) }) }));
  t.mock.method(Product, 'find', () => ({ lean: async () => [] }));
}
test('accepts only numeric Steam app identifiers and official product URLs', () => {
  assert.equal(service.steamId('https://store.steampowered.com/app/10/game'), '10');
  assert.equal(service.steamId('https://store.steampowered.com.evil.test/app/10'), null);
  assert.throws(() => service.appId('10&appids=99'));
  assert.throws(() => service.appId(0));
});
test('discovers and fetches full DLC details before a game exists, without database writes', async t => {
  t.mock.method(Game, 'findById', () => { throw new Error('Preview must not query a saved game'); });
  t.mock.method(Content.prototype, 'save', () => { throw new Error('Preview must not save content'); });
  t.mock.method(Product.prototype, 'save', () => { throw new Error('Preview must not save products'); });
  const input = { official_stores: [{ url: 'https://store.steampowered.com/app/10' }] };
  const request = fetcher({
    10: { 10: { success: true, data: { steam_appid: 10, type: 'game', name: 'Main', dlc: [20] } } },
    'list:10': { status: 1, appid: '10', dlc: [{ id: 20, name: 'Expansion' }] },
    20: { 20: { success: true, data: child } },
  });
  const list = await service.discoverDraft(input, request);
  assert.equal(list.list_complete, true);
  assert.equal(list.items[0].app_id, '20');
  const result = await service.previewOne({ ...input, app_id: '20', parent_app_id: '10' }, request);
  assert.equal(result.content.description, child.detailed_description);
  assert.equal(result.content.screenshots.length, 1);
  await assert.rejects(service.previewOne({ ...input, app_id: '20', parent_app_id: '11' }, request), { status: 400 });
});
test('empty provider lists are an explicit successful zero-result, not a failed or unstarted request', async () => {
  const input = { offers: [{ url: 'https://store.steampowered.com/app/10' }] };
  const result = await service.discoverDraft(input, fetcher({
    10: { 10: { success: true, data: { steam_appid: 10, type: 'game', name: 'Main', dlc: [] } } },
    'list:10': { status: 1, appid: '10', dlc: [] },
  }));
  assert.deepEqual(result.items, []);
  assert.equal(result.list_complete, true);
  assert.equal(result.parents.length, 1);
  assert.throws(() => service.inputParents({ official_stores: [{ url: 'https://evil.test/app/10' }] }), { status: 400 });
});
test('unions both source lists, deduplicates, and reports a failed parent without claiming completeness', async t => {
  const gameId = id();
  parentMocks(t, gameId, ['https://store.steampowered.com/app/10', 'https://store.steampowered.com/app/11']);
  const response = await service.discover(gameId, fetcher({
    10: { 10: { success: true, data: { steam_appid: 10, type: 'game', name: 'Main', dlc: [20, 21] } } },
    'list:10': { status: 1, appid: '10', dlc: [{ id: 20, name: 'Expansion' }, { id: 22, name: 'Music' }] },
  }));
  assert.deepEqual(response.items.map(row => row.app_id), ['20', '21', '22']);
  assert.equal(response.list_complete, false);
  assert.equal(response.errors.length, 1);
  assert.equal(response.parents[0].count, 3);
});
test('verifies parent, requires full descriptions and preserves media and unknown dates', async () => {
  const normalized = service.normalizeDlc(child, '10');
  assert.equal(normalized.description, child.detailed_description);
  assert.equal(normalized.release_date.toISOString(), '2015-10-12T00:00:00.000Z');
  assert.deepEqual(normalized.requirements.pc, child.pc_requirements);
  assert.equal(normalized.videos.length, 1);
  assert.throws(() => service.normalizeDlc(child, '11'), { status: 400 });
  assert.throws(() => service.normalizeDlc({ ...child, detailed_description: '' }, '10'), { status: 422 });
  assert.equal(service.normalizeDlc({ ...child, release_date: { date: 'Q4 2027' } }, '10').release_date, null);
  assert.equal(service.normalizeDlc({ ...child, type: 'music' }, '10').type, 'soundtrack');
  await new Content({ ...normalized, game_id: id() }).validate();
});
test('imports full data and a store product once, then preserves manual edits on retry', async t => {
  t.mock.method(require('../services/automaticMedia.service'), 'enrich', async () => {});
  const gameId = id(), storeId = id();
  parentMocks(t, gameId);
  let savedContent = null, savedProduct = null, creates = 0;
  t.mock.method(Store, 'findOne', async () => ({ _id: storeId }));
  t.mock.method(Content, 'findOne', () => ({ setOptions: async () => savedContent }));
  t.mock.method(Content, 'findById', () => ({ setOptions: async () => savedContent }));
  t.mock.method(Content.prototype, 'save', async function () { await this.validate(); savedContent = this; return this; });
  t.mock.method(Product, 'findOne', () => ({ setOptions: async () => savedProduct }));
  t.mock.method(Product, 'findOneAndUpdate', async (filter, update) => { creates++; savedProduct = new Product(update.$setOnInsert); return savedProduct; });
  t.mock.method(Product.prototype, 'save', async function () { await this.validate(); return this; });
  const request = fetcher({ 10: { 10: { success: true, data: { steam_appid: 10, type: 'game' } } }, 20: { 20: { success: true, data: child } } });
  const first = await service.importOne(gameId, { app_id: '20', parent_app_id: '10' }, id(), request);
  assert.equal(first.created, true);
  assert.equal(savedContent.publication_status, 'draft');
  assert.equal(savedContent.source_data.data.detailed_description, child.detailed_description);
  assert.equal(savedProduct.price.value, 9.99);
  assert.equal(String(savedProduct.content_id), String(savedContent._id));
  savedContent.title = 'Manual title';
  const second = await service.importOne(gameId, { app_id: '20', parent_app_id: '10' }, id(), request);
  assert.equal(second.created, false);
  assert.equal(savedContent.title, 'Manual title');
  assert.equal(creates, 1);

  const oldCover = 'https://example.com/old.webp';
  const newCover = 'https://example.com/new.webp';
  savedContent.image = oldCover;
  savedContent.import_errors = ['image', 'translation:title'];
  const buffer = await require('sharp')({ create: { width: 8, height: 8, channels: 3, background: 'white' } }).png().toBuffer();
  const storage = require('../utils/imageUpload');
  t.mock.method(storage, 'createClients', () => ({}));
  t.mock.method(storage, 'uploadPair', async () => ({ cloudinary: { image: { url: newCover }, preview: { url: 'https://example.com/preview.webp' } } }));
  const cleanup = t.mock.method(storage, 'removeReplacedCopies', async () => {});
  t.mock.method(require('../services/uploadSettings.service'), 'read', async () => ({ maxDimension: 64, quality: 80, previewSize: 16, previewQuality: 70 }));
  let available = false;
  t.mock.method(require('../services/remoteImage.service'), 'download', async url => {
    assert.ok([child.header_image, newCover].includes(url));
    if (url === newCover && !available) throw new Error('Cover unavailable');
    return { buffer };
  });
  const refresh = () => service.importOne(gameId, { app_id: '20', parent_app_id: '10', refresh_cover: true }, id(), request);
  await assert.rejects(refresh(), /Cover unavailable/);
  assert.equal(savedContent.image, oldCover);
  assert.equal(cleanup.mock.callCount(), 1);
  available = true;
  const refreshed = await refresh();
  assert.equal(refreshed.content.image, newCover);
  assert.equal(refreshed.content.source_image_url, child.header_image);
  assert.equal(refreshed.content.title, 'Manual title');
  assert.deepEqual(refreshed.content.import_errors, ['translation:title']);
  assert.equal(creates, 1);
});
test('rejects unrelated parent and cross-game product ownership before writing', async t => {
  const gameId = id();
  parentMocks(t, gameId);
  await assert.rejects(service.importOne(gameId, { app_id: '20', parent_app_id: '99' }, id()), { status: 400 });
  t.mock.method(Store, 'findOne', async () => ({ _id: id() }));
  t.mock.method(Product, 'findOne', () => ({ setOptions: async () => ({ content_id: id() }) }));
  t.mock.method(Content, 'findById', () => ({ setOptions: async () => ({ game_id: id() }) }));
  const request = fetcher({ 10: { 10: { success: true, data: { steam_appid: 10, type: 'game' } } }, 20: { 20: { success: true, data: child } } });
  await assert.rejects(service.importOne(gameId, { app_id: '20', parent_app_id: '10' }, id(), request), { status: 409 });
});

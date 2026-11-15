const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const service = require('../services/gamebrainImport.service');
const api = require('../services/gamebrain.service');
const Game = require('../models/game.model');
const Trophy = require('../models/achievement.model');
const models = [...new Set([
  ...['Game', 'Genre', 'GameMode', 'Theme', 'Platform', 'Tag', 'Company', 'Media', 'GamePlatform', 'Store', 'StoreProduct', 'News', 'FilterOption', 'Achievement', 'SortingOption'].map(name => mongoose.model(name)),
  ...Object.values(require('../utils/gameRelations').catalogs).map(value => value.Model),
])];
const id = () => new mongoose.Types.ObjectId();

// Real Mongoose documents and validation, with an in-memory persistence boundary.
// Rollback snapshots let these tests verify the transaction contract without
// touching the project's configured database.
function database(t) {
  let tables = Object.fromEntries(models.map(Model => [Model.modelName, []]));
  const matches = (doc, query) => Object.entries(query).every(([key, value]) => {
    if (key === '$or') return value.some(filter => matches(doc, filter));
    if (value instanceof RegExp) return value.test(doc[key] || '');
    return String(doc[key]) === String(value);
  });
  for (const Model of models) {
    const chain = (query, one) => ({
      limit() { return this; },
      session() {
        const found = tables[Model.modelName].filter(doc => matches(doc, query)).map(doc => Model.hydrate(doc));
        return Promise.resolve(one ? found[0] || null : found);
      },
    });
    t.mock.method(Model, 'findOne', query => chain(query, true));
    t.mock.method(Model, 'find', query => chain(query, false));
    t.mock.method(Model.prototype, 'save', async function (options) {
      assert.ok(options.session);
      await this.validate();
      const rows = tables[Model.modelName];
      const index = rows.findIndex(row => String(row._id) === String(this._id));
      const doc = this.toObject();
      if (index === -1) rows.push(doc); else rows[index] = doc;
      return this;
    });
  }
  t.mock.method(mongoose, 'startSession', async () => ({
    async withTransaction(action) {
      const before = Object.fromEntries(models.map(Model => [Model.modelName, tables[Model.modelName].map(doc => Model.hydrate(doc).toObject())]));
      try { await action(); } catch (error) { tables = before; throw error; }
    },
    async endSession() {},
  }));
  return {
    rows: name => tables[mongoose.model(name).modelName],
    seed: doc => tables[doc.constructor.modelName].push(doc.toObject()),
  };
}

test('real response fits typed models and optional external platform classification', () => {
  const raw = require('../data/gamebrain/responses.json').details.body;
  const game = new Game({ ...api.mapGame(raw).game, slug: 'sample', status: 'released' });
  assert.equal(game.validateSync(), undefined);
  assert.equal(game.rating.mean_critics, undefined);
  assert.ok(game.rating.mean > 0 && game.rating.mean <= 1);
  assert.equal(new Game({ title: 'Local', slug: 'local', status: 'released' }).rating, undefined);
  const Platform = mongoose.model('Platform');
  assert.equal(new Platform({ name: 'Browser', code: 'browser', value: 'browser' }).validateSync(), undefined);
  assert.ok(new Platform({ name: 'Local', code: 'local' }).validateSync().errors.device_type);
  for (const values of [{ rating: { mean: 95 } }, { id: 1.5 }, { playtime: { mentions: -1 } }]) assert.ok(new Game({ title: 'Invalid', slug: 'invalid', status: 'released', ...values }).validateSync());
});

test('Theme uses an explicit slug derived from name_en without model hooks', async () => {
  const Theme = mongoose.model('Theme');
  const { generateSlug } = require('../utils/slug');
  const theme = new Theme({ value: 'sci_fi', name: 'Science Fiction', name_en: 'Science Fiction', slug: generateSlug('Science Fiction') });
  await theme.validate();
  assert.equal(theme.value, 'sci_fi');
  assert.equal(theme.name, 'Science Fiction');
  assert.equal(theme.slug, 'science-fiction');
  assert.equal(theme.name_en, 'Science Fiction');
  assert.equal(Theme.collection.name, 'themes');
  const incomplete = new Theme({ value: 'fantasy', name: 'Fantasy' });
  await incomplete.validate();
  assert.equal(incomplete.slug, 'fantasy');
  assert.equal(incomplete.name_en, undefined);
});

test('auto-filled form stores the exact source and resolves every dependent record atomically', async t => {
  const db = database(t);
  const source = {
    id: 700, name: 'Source title', developer: 'Missing Studio',
    rating: { mean: 0.9, mean_critics: 'null' },
    themes: [{ value: 'fantasy', name: 'Fantasy' }],
    genres: [{ value: 'action', name: 'Action' }],
    play_modes: [{ value: 'single_player', name: 'Single-Player' }],
    platforms: [{ value: 'browser', name: 'Browser' }], tags: ['Adventure'],
    image: 'https://example.com/cover.jpg', description: 'Original description',
    future_field: { nullable: null, flag: false, count: 0 },
    offers: [{ store_name: 'steam', url: 'https://store.steampowered.com/app/700', price: { value: 0, currency: 'USD' } }],
  };
  const body = { gamebrain_source: source, id: 700, title: 'Reviewed title', slug: 'reviewed-title', status: 'released',
    description: 'Translated description', rating: { mean: 0.9 }, developer_ids: [], genre_ids: [], theme_ids: [], game_mode_ids: [],
  };
  let status;
  const response = { status(value) { status = value; return this; }, json() {} };
  await require('../services/game.service').addGame({ body, admin: { _id: id() } }, response);
  assert.equal(status, 201);
  const game = db.rows('Game')[0];
  assert.deepEqual(game.gamebrain_source, source);
  assert.equal(game.description, 'Translated description');
  assert.equal(game.name, 'Reviewed title');
  assert.equal(game.title, 'Reviewed title');
  for (const field of ['developer_ids', 'genre_ids', 'theme_ids', 'game_mode_ids']) assert.equal(game[field].length, 1, field);
  for (const name of ['GamePlatform', 'Tag', 'Media', 'StoreProduct']) assert.equal(db.rows(name).length, 1, name);
  assert.equal(game.rating.mean_critics, undefined);
  await require('../services/game.service').updateGame({ params: { id: String(game._id) }, body: { ...body, title: 'Edited title' }, admin: { _id: id() } }, response);
  assert.equal(status, 200);
  assert.equal(db.rows('Game').length, 1);
  assert.equal(db.rows('Game')[0].name, 'Edited title');
  assert.deepEqual(db.rows('Game')[0].gamebrain_source, source);
  await assert.rejects(service.importForm({ gamebrain_source: source, id: 701 }, id()), { status: 400 });
  assert.equal(db.rows('Game').length, 1);
});

test('import resolves dependent models, prices and news; reruns are idempotent', async t => {
  const db = database(t);
  const raw = {
    id: 123, name: 'Example', adult_only: false, release_date: '2025-01-01', developer: 'Studio',
    rating: { mean: 0.9, count: 100, mean_critics: 'null' }, playtime: { median: 12, percentiles: [1, 3, 12] },
    platforms: [{ value: 'browser', name: 'Browser' }], genres: [{ value: 'action', name: 'Action' }],
    play_modes: [{ value: 'single_player', name: 'Single-Player' }], themes: [{ value: 'fantasy', name: 'Fantasy' }],
    tags: [{ value: 'first_person', name: 'First-Person' }], image: 'https://example.com/cover.jpg',
    screenshots: ['https://example.com/screen.jpg'],
    official_stores: [{ source: 'steam', url: 'https://store.steampowered.com/app/1234' }],
    offers: [{ store_name: 'steam', url: 'https://store.steampowered.com/app/1234', platform: 'PC', price: { value: 0, initial: 20, currency: 'USD', discount_percent: 100 } }],
  };
  const options = { admin: id(), slug: 'example', status: 'released', news: [{ title: 'Update', url: 'https://example.com/news', published: '2026-11-05' }], similar: [{ id: 456 }] };
  const first = await service.importPayload(raw, options);
  const second = await service.importPayload(raw, options);
  assert.equal(String(first.game_id), String(second.game_id));
  for (const name of ['Game', 'Genre', 'GameMode', 'Theme', 'Platform', 'Tag', 'Company', 'GamePlatform', 'Store', 'StoreProduct', 'News']) assert.equal(db.rows(name).length, 1, name);
  assert.equal(db.rows('Media').length, 2);
  const game = db.rows('Game')[0];
  assert.equal(game.theme_ids.length, 1); assert.equal(game.genre_ids.length, 1);
  assert.equal(game.game_mode_ids.length, 1); assert.equal(game.developer_ids.length, 1);
  assert.equal(game.publication_status, 'draft'); assert.equal(game.adult_only, false);
  assert.equal(game.rating.mean_critics, undefined);
  assert.deepEqual(game.similar_ids, [456]);
  assert.equal(db.rows('Platform')[0].device_type, undefined);
  for (const name of ['Genre', 'GameMode', 'Theme', 'Platform', 'Tag', 'Company', 'Store']) {
    assert.ok(db.rows(name)[0].name, `${name} must use the canonical English name`);
    assert.ok(db.rows(name)[0].name_en);
  }
  assert.equal(db.rows('GamePlatform')[0].release_date, null);
  assert.deepEqual(db.rows('Tag')[0].game_ids.map(String), [String(game._id)]);
  assert.ok(game.cover_media_id);
  assert.equal(db.rows('StoreProduct')[0].price.value, 0);
  assert.equal(db.rows('StoreProduct')[0].is_official, true);
});

test('partial import preserves local relationships, published state and missing API values', async t => {
  const db = database(t);
  const series = id(), publisher = id(), genre = id();
  const game = new Game({ title: 'Old', slug: 'local-slug', status: 'upcoming', publication_status: 'published', game_series_ids: [series], publisher_ids: [publisher], genre_ids: [genre], official_website: 'https://official.example.com', rating: { mean_critics: 0.8 } });
  db.seed(game);
  const trophy = new Trophy({ game_id: game._id, platform_id: id(), achievement_group_id: id(), external_id: 'platinum', name: 'Platinum Trophy', achievement_type: 'platinum' });
  db.seed(trophy);
  await service.importPayload({ id: 42, name: 'Updated', rating: { mean: 0.9, mean_critics: 'null' } }, { target_game_id: String(game._id) });
  const saved = db.rows('Game')[0];
  assert.equal(saved.title, 'Updated'); assert.equal(saved.slug, 'local-slug');
  assert.equal(saved.status, 'upcoming'); assert.equal(saved.publication_status, 'published');
  assert.equal(saved.official_website, 'https://official.example.com');
  assert.deepEqual(saved.game_series_ids.map(String), [String(series)]);
  assert.deepEqual(saved.publisher_ids.map(String), [String(publisher)]);
  assert.deepEqual(saved.genre_ids.map(String), [String(genre)]);
  assert.equal(saved.rating.mean_critics, 0.8);
  assert.equal(saved.rating.mean, 0.9);
  assert.deepEqual(db.rows('Achievement')[0], trophy.toObject());
});

test('conflicting mappings roll back all changes and new games require local required fields', async t => {
  const db = database(t);
  await assert.rejects(service.importPayload({ id: 1, name: 'Missing local fields' }), { status: 400 });
  assert.equal(db.rows('Game').length, 0);
  db.seed(new (mongoose.model('Genre'))({ name: 'Action', slug: 'action' }));
  db.seed(new (mongoose.model('Genre'))({ name: 'Action', slug: 'another-action' }));
  await assert.rejects(service.importPayload({ id: 1, name: 'Ambiguous', developer: 'New Studio', genres: [{ value: 'action', name: 'Action' }] }, { slug: 'ambiguous', status: 'released' }), { status: 409 });
  assert.equal(db.rows('Game').length, 0); assert.equal(db.rows('Company').length, 0);
  await assert.rejects(service.importPayload({
    id: 2, name: 'Invalid price', developer: 'New Studio', image: 'https://example.com/cover.jpg',
    offers: [{ store_name: 'steam', url: 'https://store.steampowered.com/app/99', price: { value: -1 } }],
  }, { slug: 'invalid-price', status: 'released' }), { name: 'ValidationError' });
  for (const name of ['Game', 'Company', 'Media', 'Store', 'StoreProduct']) assert.equal(db.rows(name).length, 0, `rollback ${name}`);
  const linked = new Game({ title: 'Linked', slug: 'linked', status: 'released', id: 99 }); db.seed(linked);
  await assert.rejects(service.importPayload({ id: 1, name: 'Wrong game' }, { target_game_id: String(linked._id) }), { status: 409 });
});

test('regular game create and patch accept imported metadata and preserve omitted fields', async t => {
  const gameService = require('../services/game.service');
  const Theme = mongoose.model('Theme');
  const themeId = String(id());
  t.mock.method(Theme, 'countDocuments', async () => 1);
  let saved, update;
  t.mock.method(Game.prototype, 'save', async function () { saved = this; return this; });
  t.mock.method(Game, 'findByIdAndUpdate', async (key, fields) => { update = fields; return saved; });
  const response = () => ({ status() { return this; }, json() {} });
  await gameService.addGame({ body: { title: 'Example', slug: 'example', status: 'released', id: 42, rating: JSON.stringify({ mean: 0.9 }), playtime: { median: 10 }, adult_only: false, theme_ids: [themeId] }, admin: { _id: id() } }, response());
  assert.equal(saved.id, 42); assert.equal(saved.rating.mean, 0.9);
  assert.equal(saved.playtime.median, 10); assert.equal(saved.adult_only, false);
  assert.deepEqual(saved.theme_ids.map(String), [themeId]);
  await gameService.updateGame({ params: { id: String(saved._id) }, body: { title: 'Edited' } }, response());
  for (const field of ['id', 'rating', 'playtime', 'adult_only', 'theme_ids']) assert.equal(Object.hasOwn(update, field), false);
  await assert.rejects(gameService.updateGame({ params: { id: String(saved._id) }, body: { rating: { mean: 90 } } }, response()), { status: 400 });
});

test('global filter sync populates catalogs without turning input/price filters into game facts', async t => {
  const db = database(t);
  t.mock.method(api, 'filters', async () => ({ filter_options: [
    { key: 'platform', name: 'Platform', values: [{ key: 'browser', name: 'Browser', count: 10 }] },
    { key: 'theme', name: 'Theme', values: [{ key: 'fantasy', name: 'Fantasy', count: 4 }] },
    { key: 'input_mode', name: 'Input Mode', values: [{ key: 'touch', name: 'Touch', count: 6 }] },
  ] }));
  assert.deepEqual(await service.syncFilters(id()), { platform: 1, theme: 1, input_mode: 1 });
  assert.equal(db.rows('FilterOption').length, 3);
  assert.equal(db.rows('Platform').length, 1); assert.equal(db.rows('Theme').length, 1);
  assert.equal(db.rows('InputMode').length, 1);
  assert.equal(db.rows('Game').length, 0);
  assert.equal(db.rows('Platform')[0].count, undefined);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { definition, formValues } from '../src/pages/games/definitions.js';
import { gameBody } from '../src/pages/games/gameFormUtils.js';
import { providerFormValues, matchProviderOptions, providerOptionMatches } from '../src/pages/games/gameFormUtils.js';

test('Gamebrain full and short descriptions stay distinct through autofill, edit and submission', () => {
  const source = { id: 42, name: 'Example', short_description: 'Brief introduction.', description: 'Full introduction.\n\nGameplay details.\n\nStory and features.' };
  const values = { ...formValues(definition), ...providerFormValues(source) };
  assert.equal(values.short_description, source.short_description);
  assert.equal(values.description, source.description);
  const body = gameBody(values);
  assert.equal(body.short_description, source.short_description);
  assert.equal(body.description, source.description);
  const edit = formValues(definition, body);
  assert.equal(edit.short_description, source.short_description);
  assert.equal(edit.description, source.description);
  assert.equal(definition.fields.find(field => field.key === 'short_description').label, 'توضیح کوتاه');
  assert.equal(definition.fields.find(field => field.key === 'description').label, 'توضیحات کامل');
});

test('missing options are distinguished from ambiguous matches and can resolve after refreshing', () => {
  const items = [{ value: 'pc', name: 'PC' }, { value: 'new', name: 'New Platform' }];
  const rows = [{ _id: 'one', name: 'PC' }, { _id: 'two', value: 'pc' }];
  const result = providerOptionMatches(items, rows);
  assert.equal(result[0].matches.length, 1);
  assert.equal(result[0].matches[0]._id, 'two');
  assert.equal(providerOptionMatches(['PC'], rows)[0].matches.length, 2);
  assert.equal(result[1].label, 'New Platform');
  assert.equal(result[1].matches.length, 0);
  assert.deepEqual(matchProviderOptions(items, [...rows, { _id: 'created', value: 'new' }]), ['two', 'created']);
  assert.deepEqual(matchProviderOptions(['PS3'], [{ _id: 'ps3', name: 'Playstation 3', short_name: 'PS3' }]), ['ps3']);
});

test('provider fields round-trip including nested metadata and false flags', () => {
  const game = { name: 'God of War', id: 238442, adult_only: false, rating: { mean: 0.94 }, themes: [{ value: 'fantasy', name: 'Fantasy' }], twitch_videos: [{ id: 'clip', duration: 15 }], screenshots: ['https://example.com/image.jpg'] };
  const body = gameBody({ ...formValues(definition), ...providerFormValues(game) });
  for (const key of ['id','adult_only','rating','themes','twitch_videos','screenshots']) assert.deepEqual(body[key], game[key]);
  assert.equal(body.title, game.name);
  assert.deepEqual(matchProviderOptions(game.themes, [{_id:'theme',slug:'fantasy',name:'Fantasy'}]), ['theme']);
  assert.deepEqual(matchProviderOptions(game.themes, [{_id:'a',slug:'fantasy'},{_id:'b',name:'Fantasy'}]), []);
});

test('autofill submits only reviewed form fields without a provider snapshot', () => {
  const source = { id: 42, name: 'Example', rating: { mean: 0.9, mean_critics: 'null', count_critics: null }, playtime: { median: 0, percentiles: [0, 2, null] }, future_field: { flag: false } };
  const body = gameBody({ ...formValues(definition), ...providerFormValues(source) }, source);
  assert.deepEqual(body.rating, { mean: 0.9 });
  assert.deepEqual(body.playtime, { median: 0, percentiles: [0, 2] });
  assert.equal(Object.hasOwn(body, 'gamebrain_source'), false);
  assert.equal(Object.hasOwn(gameBody(formValues(definition)), 'gamebrain_source'), false);
});

test('selecting another game clears omitted provider data instead of reusing the previous selection', () => {
  const first = providerFormValues({ id: 1, name: 'First', image: 'https://example.com/first.jpg', rating: { mean: 0.8 }, themes: [{ value: 'fantasy', name: 'Fantasy' }], description: 'First description' });
  const body = gameBody({ ...formValues(definition), ...first, ...providerFormValues({ id: 2, name: 'Second' }) });
  assert.equal(body.id, 2);
  assert.equal(body.image, null);
  assert.deepEqual(body.rating, {});
  assert.deepEqual(body.themes, []);
  assert.equal(body.description, '');
});
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

test('game form exposes alternate titles and leaves API-managed content relationships untouched', () => {
  const Game = require('../../server/models/game.model.js');
  for (const key of ['sort_title', 'content_type', 'parent_game_id']) assert.equal(definition.fields.some(field => field.key === key), false);
  for (const field of definition.fields) assert.ok(Game.schema.path(field.key), field.key);
  for (const key of ['title', 'slug', 'alternate_titles', 'short_description', 'description', 'release_date', 'status', 'official_website', 'developer_ids', 'publisher_ids', 'cover_media_id', 'game_mode_ids', 'game_series_ids', 'genre_ids']) {
    assert.ok(definition.fields.some(field => field.key === key), key);
  }
});
test('editing normalizes populated relations and preserves date and classifications', () => {
  const values = formValues(definition, { title: ' Game ', release_date: '2026-09-25T00:00:00.000Z', developer_ids: [{ _id: 'company' }, 'company2'], publisher_ids: [{ _id: 'publisher' }], genre_ids: [{ _id: 'genre' }, 'genre'], game_mode_ids: ['mode'] });
  const body = gameBody(values);
  assert.equal(body.title, 'Game');
  assert.equal(Object.hasOwn(body, 'sort_title'), false);
  assert.deepEqual(body.developer_ids, ['company', 'company2']);
  assert.deepEqual(body.publisher_ids, ['publisher']);
  assert.equal(body.release_date, '2026-09-25');
  assert.deepEqual(body.genre_ids, ['genre']);
  assert.deepEqual(body.game_mode_ids, ['mode']);
  assert.equal(Object.hasOwn(body, 'parent_game_id'), false);
  assert.equal(Object.hasOwn(body, 'content_type'), false);
  assert.equal(body.cover_media_id, null);
  assert.equal(body.official_website, null);
});
test('alternate titles round-trip, trim, deduplicate and clear explicitly', () => {
  const body = gameBody(formValues(definition, { title: 'Grand Theft Auto V', alternate_titles: [' GTA V ', 'gta v', 'جی تی ای ۵'] }));
  assert.deepEqual(body.alternate_titles, ['GTA V', 'جی تی ای ۵']);
  assert.deepEqual(gameBody(formValues(definition, { alternate_titles: [] })).alternate_titles, []);
});

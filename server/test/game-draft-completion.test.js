const { test } = require('node:test');
const assert = require('node:assert/strict');
const Game = require('../models/game.model');
const completion = require('../services/gameDraftCompletion.service');
function setup(t) {
  for (const file of ['platform', 'genre', 'theme', 'gameMode', 'tag', 'company']) t.mock.method(require(`../models/${file}.model`), 'find', () => ({ lean: async () => [{ _id: file + '-id', value: 'match', name: 'Match' }] }));
  t.mock.method(Game, 'findOneAndUpdate', (filter, update) => ({ lean: async () => ({ ...update.$set }) }));
}
test('completion persists Persian descriptions and mapped catalog IDs before final form submission', async t => {
  setup(t); let calls = 0;
  t.mock.method(require('../services/translation.service'), 'translatePersian', async () => { calls++; return { translation: 'توضیحات فارسی بازی' }; });
  const record = { _id: 'game', auto_draft: true, description: 'English', short_description: 'English', gamebrain_source: { description: 'English', short_description: 'English', platforms: [{ value: 'match' }], genres: [{ value: 'match' }], themes: [{ value: 'match' }], play_modes: [{ value: 'match' }], tags: [{ value: 'match' }], developer: 'Match' } };
  const saved = await completion.complete(record);
  assert.equal(calls, 1); assert.equal(saved.description, 'توضیحات فارسی بازی'); assert.equal(saved.short_description, saved.description);
  for (const field of ['platform_ids', 'genre_ids', 'theme_ids', 'game_mode_ids', 'tags', 'developer_ids']) assert.equal(saved[field].length, 1, field);
  assert.equal(saved.draft_completed, true); assert.deepEqual(saved.draft_completion_errors, []);
});
test('completed and finalized games require no translation or catalog queries', async t => {
  t.mock.method(Game, 'findOneAndUpdate', () => { throw Error('Unexpected write'); });
  for (const record of [{ auto_draft: false }, { auto_draft: true, draft_completed: true }]) assert.equal(await completion.complete(record), record);
});
test('manual Persian text and previously selected relationships are preserved', async t => {
  setup(t);
  t.mock.method(require('../services/translation.service'), 'translatePersian', async () => { throw Error('Should not translate edited text'); });
  const saved = await completion.complete({ _id: 'game', auto_draft: true, description: 'متن دستی', short_description: 'متن کوتاه دستی', platform_ids: ['manual-id'], gamebrain_source: { description: 'English', short_description: 'Short' } });
  assert.equal(saved.description, undefined); assert.equal(saved.short_description, undefined); assert.equal(saved.platform_ids, undefined);
});

test('unmatched catalogs remain incomplete and retry merges resolved IDs without losing saved selections', async t => {
  setup(t);
  const unresolved = await completion.complete({ _id: 'game', auto_draft: true, gamebrain_source: { developer: 'Unknown studio' } });
  assert.equal(unresolved.draft_completed, false);
  assert.deepEqual(unresolved.draft_completion_errors, ['developer_ids:Unknown studio']);
  const retried = await completion.complete({ _id: 'game', auto_draft: true, draft_completed: true, draft_completion_errors: ['developer_ids:Match'], developer_ids: ['existing'], gamebrain_source: { developer: 'Match' } });
  assert.deepEqual(retried.developer_ids, ['existing', 'company-id']);
  assert.equal(retried.draft_completed, true);
  assert.deepEqual(retried.draft_completion_errors, []);
});

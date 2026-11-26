const { test } = require('node:test');
const assert = require('node:assert/strict');
const Game = require('../models/game.model');
const gamebrain = require('../services/gamebrain.service');
const { fillSimilarIds, catalogSimilar } = require('../services/gameSimilar.service');

test('saving a game keeps unique recommendation IDs even before those games exist locally', async t => {
  const lookup = t.mock.method(gamebrain, 'similar', async (id, params) => {
    assert.equal(id, '123');
    assert.deepEqual(params, { limit: '10' });
    return { results: [{ id: 123 }, { id: '44' }, { id: 75, name: 'Preview', image: 'https://example.test/cover.webp' }, { id: 44 }, { id: 'invalid' }] };
  });
  const details = t.mock.method(gamebrain, 'details', async id => ({ id: Number(id), name: 'From details' }));
  const values = { id: 123, similar_ids: [] };
  await fillSimilarIds(values);
  assert.deepEqual(values.similar_ids, [44, 75]);
  assert.deepEqual(values.similar_previews.map(row => row.title), ['From details', 'Preview']);
  assert.equal(details.mock.callCount(), 1);
  const update = { id: 123, similar_ids: [] };
  await fillSimilarIds(update, values);
  assert.equal(Object.hasOwn(update, 'similar_ids'), false);
  assert.equal(lookup.mock.callCount(), 1);
  assert.equal(details.mock.callCount(), 1);
});

test('GameBrain errors leave a new game saveable and recommendations retryable', async t => {
  t.mock.method(gamebrain, 'similar', async () => { throw Error('offline'); });
  const values = { id: 123, similar_ids: [] };
  await fillSimilarIds(values);
  assert.deepEqual(values, { id: 123 });
});

test('catalog suggestions resolve published games on each read in provider order', async t => {
  const first = { _id: 'first', id: 44, title: 'First' };
  const later = { _id: 'later', id: 75, title: 'Later' };
  let records = [first];
  t.mock.method(Game, 'find', query => {
    assert.deepEqual(query, { id: { $in: [75, 44] }, publication_status: 'published' });
    return { select: () => ({ lean: async () => records }) };
  });
  const cached = { id: 75, title: 'Cached', image: 'https://example.test/cover.webp' };
  const game = { id: 123, similar_ids: [75, 44], similar_previews: [cached] };
  assert.deepEqual(await catalogSimilar(game), [cached, first]);
  records = [first, later];
  assert.deepEqual(await catalogSimilar(game), [{ ...later, image: cached.image }, first]);
});

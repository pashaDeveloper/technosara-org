const { test } = require('node:test');
const assert = require('node:assert/strict');
const { alternateTitleValues, gameTitleSearch } = require('../utils/gameTitles');
const Game = require('../models/game.model');
const service = require('../services/game.service');
test('alternate titles validate, deduplicate, preserve omission and allow clearing', () => {
  assert.deepEqual(alternateTitleValues({}), {});
  assert.deepEqual(alternateTitleValues({ alternate_titles: [] }), { alternate_titles: [] });
  assert.deepEqual(alternateTitleValues({ alternate_titles: '[" GTA V ","gta v","جی تی ای ۵"]' }), { alternate_titles: ['GTA V', 'جی تی ای ۵'] });
  for (const value of [null, {}, 'bad json', [3], [' '], ['x'.repeat(201)], Array(101).fill('A')]) assert.throws(() => alternateTitleValues({ alternate_titles: value }), { status: 400 });
});
test('search matches original and alternate titles literally, ignoring Latin case', () => {
  const query = gameTitleSearch('GTA V');
  assert.deepEqual(Object.keys(query.$or[1]), ['alternate_titles']);
  const matcher = new RegExp(query.$or[1].alternate_titles.$regex, query.$or[1].alternate_titles.$options);
  assert.ok(matcher.test('gta v'));
  assert.equal(gameTitleSearch('C++').$or[0].title.$regex, 'C\\+\\+');
  assert.deepEqual(gameTitleSearch('  '), {});
  assert.throws(() => gameTitleSearch({ $ne: null }), { status: 400 });
});
test('game API persists alternate titles and does not reset them on unrelated updates', async t => {
  let saved, update;
  t.mock.method(Game.prototype, 'save', async function () { saved = this; return this; });
  t.mock.method(Game, 'findByIdAndUpdate', async (id, body) => { update = body; return saved; });
  const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } });
  const res = response();
  await service.addGame({ body: { title: 'Grand Theft Auto V', slug: 'gta-v', status: 'released', alternate_titles: ['GTA V', 'جی تی ای ۵'] }, admin: {} }, res);
  assert.equal(res.code, 201); assert.deepEqual([...saved.alternate_titles], ['GTA V', 'جی تی ای ۵']);
  await service.updateGame({ params: { id: String(saved._id) }, body: { title: 'Updated' } }, response());
  assert.equal(Object.hasOwn(update, 'alternate_titles'), false);
  await service.updateGame({ params: { id: String(saved._id) }, body: { alternate_titles: [] } }, response());
  assert.deepEqual(update.alternate_titles, []);
});

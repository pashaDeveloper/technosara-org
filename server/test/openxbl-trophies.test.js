const { test } = require('node:test');
const assert = require('node:assert/strict');
const api = require('../services/openxblTrophies.service');
const mongoose = require('mongoose');
const Achievement = require('../models/achievement.model');
const source = { official_stores: [{ url: 'https://www.xbox.com/en-US/games/store/game/BPJ686W6S0NH' }], product_id: 'BPJ686W6S0NH' };
function fixture(t, mode) {
  const before = process.env.OPENXBL_API_KEY;
  process.env.OPENXBL_API_KEY = 'test-key';
  t.after(() => { if (before == null) delete process.env.OPENXBL_API_KEY; else process.env.OPENXBL_API_KEY = before; });
  return async (url, options) => {
    if (url.startsWith('https://displaycatalog.mp.microsoft.com/')) return new Response(JSON.stringify({ Products: [{ ProductId: 'BPJ686W6S0NH', LocalizedProperties: [{ ProductTitle: 'Example' }], Properties: { XboxConsoleGenCompatible: ['ConsoleGen8', 'ConsoleGen9'] }, AlternateIds: mode === 'bundle' ? [] : [{ IdType: 'XboxTitleId', Value: '456' }] }] }));
    assert.equal(options.headers['Accept-Language'], 'en-US');
    assert.equal(options.headers['X-Authorization'], 'test-key');
    let content;
    if (url.endsWith('/account')) content = { profileUsers: [{ id: '123' }] };
    else if (url.endsWith('/achievements')) throw new Error('Library lookup must not be required');
    else {
      const second = url.includes('continuationToken=');
      content = { achievements: [{ id: second && mode !== 'duplicate' ? '2' : '1', name: 'First', lockedDescription: 'Description', rewards: [{ type: 'Gamerscore', value: '10' }], titleAssociations: [{ id: mode === 'wrong' ? 999 : 456 }] }], pagingInfo: { continuationToken: second ? null : 'next', totalRecords: mode === 'incomplete' ? 3 : 2 } };
      Object.assign(content.achievements[0], { rarity: { currentPercentage: mode === 'bad-rarity' ? 101 : 2.33, currentCategory: 'Rare' }, achievementType: 'Persistent', participationType: 'Individual', estimatedTime: '00:00:00', timeWindow: { startDate: '2026-01-01T00:00:00Z', endDate: '2026-12-31T00:00:00Z' }, isRevoked: false, progression: { timeUnlocked: '0001-01-01T00:00:00.0000000Z', requirements: [{ id: 'requirement', current: '1', target: '3', operationType: 'Sum', valueType: 'Integer' }] }, progressState: 'InProgress' });
    }
    return new Response(JSON.stringify({ code: mode === 'quota' ? 429 : 200, content }));
  };
}
test('search limits Xbox versions to the original achievement platform', async t => {
  const rows = await api.candidates({ ...source, title: 'unrelated name' }, fixture(t));
  assert.deepEqual(rows[0].platforms, ['xbox_one']);
  assert.deepEqual(rows[0].compatible_platforms, ['Xbox One', 'Xbox Series X|S']);
  await assert.rejects(api.preview({ ...source, ppid: '456', platform: 'xbox_series_xs' }, fixture(t)), { status: 400 });
});
test('unwraps responses, follows pagination, and validates catalogue achievements', async t => {
  const data = await api.preview({ ...source, ppid: '456', platform: 'xbox_one' }, fixture(t));
  assert.equal(data.total, 2);
  assert.equal(data.provider, 'openxbl');
  assert.equal(data.trophies[0].points, 10);
  assert.equal(data.trophies[0].progressState, undefined);
  assert.equal(data.trophies[0].rarity, 2.33);
  assert.equal(data.trophies[0].rarity_category, 'Rare');
  assert.equal(data.trophies[0].estimated_time, null);
  assert.equal(data.account_progress[0].unlocked_at, null);
  assert.equal(data.account_progress[0].requirements[0].current, '1');
  assert.equal(data.trophies[0].account_id, undefined);
  for (const row of data.trophies) await new Achievement({ ...row, game_id: new mongoose.Types.ObjectId(), platform_id: new mongoose.Types.ObjectId(), achievement_group_id: new mongoose.Types.ObjectId() }).validate();
});
test('requires store identity, rejects bundles and mismatched title IDs', async t => {
  await assert.rejects(api.candidates({ title: 'Example' }, fixture(t)), { status: 400 });
  await assert.rejects(api.candidates(source, fixture(t, 'bundle')), { status: 409 });
  await assert.rejects(api.preview({ ...source, ppid: '999', platform: 'xbox_one' }, fixture(t)), { status: 409 });
  await assert.rejects(api.preview({ ...source, product_id: '9N4W31HSMVVD', ppid: '456', platform: 'xbox_one' }, fixture(t)), { status: 409 });
});
test('rejects duplicate, mismatched and incomplete lists and embedded quota errors', async t => {
  for (const mode of ['duplicate', 'wrong', 'incomplete', 'quota', 'bad-rarity']) await assert.rejects(api.preview({ ...source, ppid: '456', platform: 'xbox_one' }, fixture(t, mode)), { status: mode === 'quota' ? 429 : 502 });
});
test('persists source metadata and account snapshots without replacing manual names', async t => {
  const Game = require('../models/game.model');
  const Platform = require('../models/platform.model');
  const Group = require('../models/achievementGroup.model');
  const Progress = require('../models/achievementProgress.model');
  const gameId = new mongoose.Types.ObjectId(), platformId = new mongoose.Types.ObjectId();
  t.mock.method(Game, 'findById', async () => ({ official_stores: source.official_stores }));
  t.mock.method(require('../services/automaticMedia.service'), 'enrich', async () => {});
  t.mock.method(Platform, 'findOne', async () => ({ _id: platformId }));
  let group;
  t.mock.method(Group, 'findOne', async () => group);
  t.mock.method(Group, 'findOneAndUpdate', async (_, update) => { group = new Group(update.$setOnInsert); return group; });
  t.mock.method(Group.prototype, 'save', async function () { await this.validate(); return this; });
  const achievements = new Map(), snapshots = new Map();
  t.mock.method(Achievement, 'findOneAndUpdate', async (identity, update) => {
    if (!achievements.has(identity.external_id)) achievements.set(identity.external_id, new Achievement(update.$setOnInsert));
    const row = achievements.get(identity.external_id);
    Object.assign(row, update.$set); await row.validate(); return row;
  });
  t.mock.method(Achievement, 'countDocuments', async () => achievements.size);
  t.mock.method(Progress, 'findOneAndUpdate', async (identity, update) => {
    const snapshot = new Progress({ ...identity, ...update.$set }); await snapshot.validate(); snapshots.set(String(identity.achievement_id), snapshot); return snapshot;
  });
  const input = { ...source, ppid: '456', platform: 'xbox_one' };
  await api.importTrophies(gameId, input, null, fixture(t));
  achievements.get('1').name = 'Manual title';
  await api.importTrophies(gameId, input, null, fixture(t));
  assert.equal(achievements.get('1').name, 'Manual title');
  assert.equal(achievements.get('1').rarity_category, 'Rare');
  assert.equal(snapshots.size, 2);
  assert.equal([...snapshots.values()][0].account_id, '123');
});

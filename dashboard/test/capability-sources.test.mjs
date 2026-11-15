import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capabilityPlatform, mergeCapabilitySources } from '../src/pages/games/capabilitySourceUtils.js';

test('source platform families do not spill into individual consoles', () => {
  assert.equal(capabilityPlatform({ name: 'Xbox Series X|S' }), 'xbox_series_xs');
  assert.equal(capabilityPlatform({ code: 'playstation-5' }), 'ps5');
  assert.equal(capabilityPlatform({ value: 'windows' }), 'pc');
  assert.equal(capabilityPlatform({ code: 'xbox-series-s' }), undefined);
});

test('source evidence fills missing fields and preserves manual false and unrelated platforms', () => {
  const rows = [{ platform_id: 'pc', status: { hdr: false } }];
  const result = mergeCapabilitySources(rows, { cloud_saves: false }, [{ platforms: [{ platform: 'pc', status: { hdr: true, vr: true } }, { platform: 'ps5', status: { vr: true } }], capability_status: { cloud_saves: true, single_player: true } }, { error: 'Unavailable' }], [{ _id: 'pc', code: 'pc' }, { _id: 'ps5', code: 'ps5' }], ['pc']);
  assert.deepEqual(result.rows, [{ platform_id: 'pc', status: { hdr: false, vr: true } }]);
  assert.deepEqual(result.states, { cloud_saves: false, single_player: true });
  assert.equal(result.added, 2);
  assert.deepEqual(rows, [{ platform_id: 'pc', status: { hdr: false } }]);
  assert.deepEqual(mergeCapabilitySources(result.rows, result.states, [], [], []), { ...result, added: 0 });
});

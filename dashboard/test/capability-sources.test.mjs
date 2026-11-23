import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capabilityPlatform, mergeCapabilitySources } from '../src/pages/games/capabilitySourceUtils.js';

test('source platform families do not spill into individual consoles', () => {
  assert.equal(capabilityPlatform({ name: 'Xbox Series X|S' }), 'xbox_series_xs');
  assert.equal(capabilityPlatform({ code: 'playstation-5' }), 'ps5');
  assert.equal(capabilityPlatform({ value: 'windows' }), 'pc');
  assert.equal(capabilityPlatform({ code: 'xbox-series-s' }), undefined);
});

test('evidence from any platform fills missing game capabilities and preserves manual false', () => {
  const existing = { cloud_saves: false, hdr: false };
  const result = mergeCapabilitySources(existing, [{
    platforms: [{ platform: 'pc', status: { hdr: true, vr: true } }, { platform: 'ps5', status: { vr: true, '4k': true } }],
    capability_status: { cloud_saves: true, single_player: true },
  }, { error: 'Unavailable', capability_status: { ray_tracing: true } }]);
  assert.deepEqual(result, {
    states: { cloud_saves: false, hdr: false, single_player: true, vr: true, '4k': true },
    added: 3,
  });
  assert.deepEqual(existing, { cloud_saves: false, hdr: false });
  assert.deepEqual(mergeCapabilitySources(result.states, []), { ...result, added: 0 });
});

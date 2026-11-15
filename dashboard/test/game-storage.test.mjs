import test from 'node:test';
import assert from 'node:assert/strict';
import { definition, formValues } from '../src/pages/games/definitions.js';
import { gameBody } from '../src/pages/games/gameFormUtils.js';
test('storage evidence round-trips through create and edit forms and can be cleared', () => {
  const row = { platform: 'xbox', platform_id: null, kind: 'download', bytes: 162640646144, provider: 'xbox', source_url: 'https://www.xbox.com/en-US/games/store/game/9NNX1VVR3KNQ', checked_at: '2026-11-13T00:00:00.000Z' };
  const values = formValues(definition, { title: 'Forza Horizon 5', slug: 'forza-horizon-5', storage_sizes: [row] });
  assert.deepEqual(gameBody(values).storage_sizes, [row]);
  assert.deepEqual(gameBody({ ...values, storage_sizes: '[]' }).storage_sizes, []);
  assert.deepEqual(gameBody(formValues(definition)).storage_sizes, []);
});

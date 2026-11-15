import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalBody, localizedNames, usesLegacyNames } from '../src/utils/canonicalNames.js';

test('existing Persian forms read canonical names and submit separate languages without mutating records', () => {
  const record = { data: [{ name: 'Historical', name_fa: 'تاریخی', name_en: 'Historical' }] };
  assert.equal(localizedNames(record).data[0].name, 'تاریخی');
  assert.equal(record.data[0].name, 'Historical');
  assert.deepEqual(canonicalBody({ name: 'تاریخی', name_en: 'Historical' }), { name: 'Historical', name_en: 'Historical', name_fa: 'تاریخی' });
  const form = new FormData(); form.set('name', 'تاریخی'); form.set('name_en', 'Historical');
  const request = canonicalBody(form);
  assert.equal(request.get('name_fa'), 'تاریخی'); assert.equal(request.get('name'), 'Historical');
  assert.equal(form.get('name'), 'تاریخی');
  assert.equal(usesLegacyNames('/genres/all'), true);
  assert.equal(usesLegacyNames('/gamebrain/games'), false);
  assert.equal(usesLegacyNames('/themes/all'), false);
});

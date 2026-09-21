import { test } from 'node:test';
import assert from 'node:assert/strict';
import { englishSlug, genreBody } from '../src/pages/genres/genreFormUtils.js';

test('translated English names produce usable slugs', () => {
  assert.equal(englishSlug(' Action & Adventure! '), 'action-adventure');
  assert.equal(englishSlug("Children’s Role-Playing"), 'childrens-role-playing');
  assert.equal(englishSlug('Café'), 'cafe');
});

test('genre submission preserves Persian and English names and image deletion', () => {
  const result = genreBody({ name_en: ' Action ', name: ' اکشن ', slug: ' action ', description: ' توضیح ', image: '', is_active: false });
  assert.deepEqual(result, { name_en: 'Action', name: 'اکشن', slug: 'action', description: 'توضیح', image: '' });
});

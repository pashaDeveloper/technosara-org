const { test } = require('node:test');
const assert = require('node:assert/strict');
const { completion } = require('../services/importCompletion');

test('trophy completion requires saved translation and uploaded icon independently', () => {
  const trophy = { name_en: 'Award', description_en: 'Win', icon_url: 'https://source/icon.png' };
  assert.deepEqual(completion(trophy, 'trophy'), { registered: true, translated: false, uploaded: false, complete: false });
  trophy.name_fa = 'جایزه'; trophy.description_fa = 'پیروزی';
  assert.equal(completion(trophy, 'trophy').translated, true);
  assert.equal(completion(trophy, 'trophy').complete, false);
  trophy.image_storage = { cloudinary: { image: { url: trophy.icon_url } } };
  assert.equal(completion(trophy, 'trophy').complete, true);
  trophy.import_errors = ['image'];
  assert.equal(completion(trophy, 'trophy').complete, false);
});

test('DLC completion requires every screenshot and permits absent optional text and images', () => {
  const dlc = { title_en: 'Expansion', title_fa: 'افزونه', screenshots: ['one', 'two'], screenshot_storage: { 0: { cloudinary: { image: { url: 'one' } } } } };
  assert.equal(completion(dlc, 'dlc').complete, false);
  dlc.screenshot_storage[1] = { cloudinary: { image: { url: 'two' } } };
  assert.equal(completion(dlc, 'dlc').complete, true);
});

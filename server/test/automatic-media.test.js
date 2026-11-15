const { test } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const service = require('../services/automaticMedia.service');
const storage = require('../utils/imageUpload');
const settings = require('../services/uploadSettings.service');
const remote = require('../services/remoteImage.service');
const translation = require('../services/translation.service');
async function fixtures(t) {
  const buffer = await sharp({ create: { width: 100, height: 100, channels: 3, background: '#b3478d' } }).png().toBuffer();
  const files = new Map(), calls = [];
  t.mock.method(settings, 'read', async () => ({ ...settings.defaults, previewSize: 32 }));
  t.mock.method(remote, 'download', async () => ({ buffer }));
  t.mock.method(translation, 'translatePersian', async text => ({ translation: `ترجمه فارسی ${text}` }));
  t.mock.method(storage, 'createClients', () => ({ cloudinary: {
    async put(key, body) { calls.push(key); files.set(key, body); return { key, url: `https://res.cloudinary.com/test/${key}` }; },
    async remove(key) { files.delete(key); },
  } }));
  return { files, calls };
}
function document(values) { return { ...values, snapshots: [], async save() { this.snapshots.push({ name_en: this.name_en, description_en: this.description_en, icon_url: this.icon_url }); return this; } }; }
test('trophy stores English first, persists Persian separately, and names icon and preview after trophy', async t => {
  const { files, calls } = await fixtures(t);
  const doc = document({ name: 'Master Hunter', description: 'Win 10 matches', locked_description: 'Keep playing', icon_url: 'https://example.com/trophy.png' });
  await service.enrich(doc, { title: 'Halo Infinite' }, 'trophy');
  assert.equal(doc.name, 'Master Hunter'); assert.equal(doc.name_en, 'Master Hunter'); assert.ok(doc.name_fa.includes('فارسی'));
  assert.equal(doc.description_en, 'Win 10 matches'); assert.ok(doc.description_fa.includes('فارسی'));
  assert.equal(doc.locked_description_en, 'Keep playing'); assert.ok(doc.locked_description_fa);
  assert.equal(doc.snapshots[0].icon_url, 'https://example.com/trophy.png'); assert.equal(doc.snapshots[0].name_en, 'Master Hunter');
  assert.match(doc.icon_url, /game\/halo-infinite\/trophy\/master-hunter\/master-hunter-/);
  assert.equal((await sharp(files.get(doc.image_storage.cloudinary.preview.key)).metadata()).width, 32);
  await service.enrich(doc, { title: 'Halo Infinite' }, 'trophy'); assert.equal(calls.length, 2);
});
test('DLC cover and every screenshot upload automatically in named DLC folders', async t => {
  const { calls } = await fixtures(t);
  const doc = document({ title: 'Phantom Liberty', description: 'Expansion story', short_description: 'An expansion', image: 'https://example.com/cover.png', screenshots: ['https://example.com/shot.png'] });
  await service.enrich(doc, { title: 'Cyberpunk 2077' }, 'dlc');
  assert.equal(doc.title_en, 'Phantom Liberty'); assert.ok(doc.title_fa); assert.equal(doc.description_en, 'Expansion story'); assert.ok(doc.description_fa);
  assert.match(doc.image, /game\/cyberpunk-2077\/dlc\/phantom-liberty\/phantom-liberty-/);
  assert.match(doc.screenshots[0], /dlc\/phantom-liberty\/screenshot-phantom-liberty-/);
  assert.equal(calls.length, 4);
  doc.description = 'Manual editorial description';
  await service.enrich(doc, { title: 'Cyberpunk 2077' }, 'dlc'); assert.equal(calls.length, 4); assert.equal(doc.description, 'Manual editorial description');
});
test('translation failure preserves English and successful cloud images for retry', async t => {
  const { calls } = await fixtures(t);
  t.mock.method(translation, 'translatePersian', async () => { throw new Error('Translator unavailable'); });
  const doc = document({ name: 'Unique Retry Trophy', description: 'English preserved', icon_url: 'https://example.com/icon.png' });
  await assert.rejects(service.enrich(doc, { title: 'Game' }, 'trophy'), { status: 502 });
  assert.equal(doc.description_en, 'English preserved'); assert.ok(doc.import_errors.includes('translation:description'));
  assert.match(doc.icon_url, /res.cloudinary.com/);
  translation.translatePersian.mock.mockImplementation(async () => ({ translation: 'فارسی' }));
  await service.enrich(doc, { title: 'Game' }, 'trophy'); assert.equal(calls.length, 2); assert.equal(doc.description_fa, 'فارسی'); assert.deepEqual(doc.import_errors, []);
});
test('database failure removes new cloud copies without dropping original URL', async t => {
  const { files } = await fixtures(t);
  const doc = { icon_url: 'https://example.com/original.png', async save() { throw new Error('Database failed'); } };
  await assert.rejects(service.saveImage(doc, { title: 'Game' }, 'trophy', 'Named Trophy', 'icon_url', 'source_icon_url'));
  assert.equal(files.size, 0); assert.equal(doc.icon_url, 'https://example.com/original.png');
});

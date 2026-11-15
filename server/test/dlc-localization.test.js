const { test } = require('node:test');
const assert = require('node:assert/strict');
const { plainDescription, localizeDlc } = require('../services/dlcLocalization.service');

test('translates the full description into Persian as plain text and preserves other DLC fields', async () => {
  const source = { title: 'Expansion', description: '<p>Unlock new missions &amp; weapons.</p><p>Final chapter.</p>', price: 10 };
  const result = await localizeDlc(source, async (text, _, options) => {
    assert.equal(text, 'Unlock new missions & weapons.\nFinal chapter.');
    assert.deepEqual(options, { sourceLanguage: 'en', targetLanguage: 'fa', longText: true });
    return { translation: 'مأموریت‌ها و سلاح‌های تازه را باز کنید.\nفصل پایانی.' };
  });
  assert.match(result.description, /فصل پایانی/);
  assert.equal(result.title, source.title);
  assert.equal(source.description.startsWith('<p>'), true);
  assert.equal(result.price, 10);
  assert.equal(plainDescription('A&nbsp;B<br/>C &#39;D&#39;'), "A B\nC 'D'");
});
test('translation failures and untranslated responses are not presented as Persian success', async () => {
  await assert.rejects(localizeDlc({ description: 'Text' }, async () => { throw new Error('Unavailable'); }), { status: 502 });
  await assert.rejects(localizeDlc({ description: 'Text' }, async () => ({ translation: 'English again' })), { status: 502 });
});

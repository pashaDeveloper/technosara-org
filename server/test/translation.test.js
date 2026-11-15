const { test } = require('node:test');
const assert = require('node:assert/strict');
const { translatePersian } = require('../services/translation.service');

test('English descriptions are chunked and translated to Persian', async () => {
  let calls = 0;
  const result = await translatePersian('A long description. '.repeat(70), async (url, options) => {
    calls++;
    assert.equal(url.searchParams.get('from'), 'en');
    assert.equal(url.searchParams.get('to'), 'fa');
    assert.ok(Buffer.byteLength(JSON.parse(options.body)[0], 'utf8') <= 500);
    return { ok: true, json: async () => [{ translations: [{ text: 'ترجمه', to: 'fa' }] }] };
  }, {sourceLanguage:'en',targetLanguage:'fa',longText:true});
  assert.ok(calls > 1);
  assert.equal(result.targetLanguage, 'fa');
  assert.ok(result.translation.includes('ترجمه'));
});

test('all genre names use the provider response without manual equivalents', async () => {
  let calls = 0;
  const provider = async () => {
    calls++;
    return { ok: true, json: async () => [{ translations: [{ text: 'Provider result', to: 'en' }] }] };
  };
  assert.equal((await translatePersian('اکشن', provider)).translation, 'Provider result');
  await translatePersian('یک ژانر جدید', provider);
  assert.equal(calls, 2);
});

test('validates input by UTF-8 bytes before calling the provider', async () => {
  const never = () => assert.fail('Provider must not be called');
  for (const text of [undefined, {}, '', '  ', 'س'.repeat(251)]) {
    await assert.rejects(translatePersian(text, never), { status: 400 });
  }
});

test('requests Persian to English and returns the translation', async () => {
  const result = await translatePersian(' سلام ', async (url, options) => {
    assert.equal(url.origin + url.pathname, 'https://edge.microsoft.com/translate/translatetext');
    assert.equal(url.searchParams.get('from'), 'fa');
    assert.equal(url.searchParams.get('to'), 'en');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), ['سلام']);
    assert.ok(options.signal);
    return { ok: true, json: async () => [{ translations: [{ text: 'Hello', to: 'en' }] }] };
  });
  assert.equal(result.translation, 'Hello');
  assert.equal(result.provider, 'Microsoft Translator');
});

test('accepts the exact UTF-8 limit', async () => {
  await translatePersian('س'.repeat(250), async () => ({ ok: true, json: async () => [{ translations: [{ text: 'text', to: 'en' }] }] }));
});

test('handles quota exhaustion, invalid responses and connection failure', async () => {
  await assert.rejects(translatePersian('سلام', async () => ({ ok: false, status: 429 })), { status: 429 });
  for (const data of [{}, [], [null], [{ translations: {} }], [{ translations: [{ text: '', to: 'en' }] }], [{ translations: [{ text: 'bonjour', to: 'fr' }] }]]) {
    await assert.rejects(translatePersian('سلام', async () => ({ ok: true, json: async () => data })), { status: 502 });
  }
  await assert.rejects(translatePersian('سلام', async () => { throw new Error('network'); }), { status: 502 });
  await assert.rejects(translatePersian('سلام', async () => ({ ok: false })), { status: 502 });
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { productUrl, parseXbox, parseSony, descriptions } = require('../services/storeDescriptions.service');
const { selectTitle, byTitle } = require('../services/storeDescriptions.service');
const { resolveDescription } = require('../services/storeDescriptions.service');

test('an unusable saved URL falls back to title lookup', async () => {
  const result = await resolveDescription({ provider: 'sony', title: 'last of us', url: 'https://invalid.example/game' }, async url => {
    if (url.includes('/tumbler/')) return new Response(JSON.stringify({ links: [{ id: 'UP9000-GAME', name: 'The Last of Us' }] }));
    return new Response('<script type="application/ld+json">' + JSON.stringify({ '@type': 'Product', name: 'The Last of Us', description: 'Game description.' }) + '</script>');
  });
  assert.equal(result.description, 'Game description.');
});

test('title lookup tolerates leading The and trademarks but rejects other games and ambiguous editions', () => {
  const row = { title: 'The Last Of Us™', url: 'https://store.playstation.com/en-us/product/GAME' };
  assert.equal(selectTitle([row], 'last of us'), row);
  const partTwo = { title: 'The Last of Us™ Part II Remastered', url: 'part-two' };
  assert.equal(selectTitle([partTwo], 'The Last Of Us Part 2 Remastered'), partTwo);
  assert.throws(() => selectTitle([{ title: 'The Walking Dead', url: 'other' }], 'last of us'), error => error.status === 404);
  assert.throws(() => selectTitle([row, { ...row, url: 'different' }], 'last of us'), error => error.status === 409);
});

test('official PlayStation game links resolve to the store product', async () => {
  const result = await descriptions('sony', 'https://www.playstation.com/en-us/games/the-last-of-us-part-ii-remastered/', async url => {
    if (url.startsWith('https://www.playstation.com/')) return new Response('<a href="https://store.playstation.com/en-us/concept/10001">Buy</a>');
    assert.equal(url, 'https://store.playstation.com/en-us/concept/10001');
    return new Response('<script type="application/ld+json">' + JSON.stringify({ '@type': 'Product', name: 'Part II', description: 'Full description' }) + '</script>');
  });
  assert.equal(result.description, 'Full description');
});

test('Sony title lookup uses catalog fallback when a legacy product page redirects', async () => {
  const calls = [];
  const result = await byTitle('sony', 'last of us', async (url, options) => {
    calls.push(url);
    assert.equal(options.redirect, 'error');
    if (url.includes('/tumbler/')) return new Response(JSON.stringify({ links: [{ id: 'UP9000-GAME', name: 'The Last Of Us™' }] }));
    if (url.includes('/container/')) return new Response(JSON.stringify({ name: 'The Last Of Us™', long_desc: 'Opening.<br><br>Full text.' }));
    throw new Error('redirect');
  });
  assert.equal(result.title, 'The Last Of Us™');
  assert.equal(result.short_description, 'Opening.');
  assert.equal(calls.length, 3);
});

test('only explicit official product URLs can be fetched', () => {
  assert.match(productUrl('xbox', 'https://www.xbox.com/en-US/games/store/game/9N4W31HSMVVD').request, /^https:\/\/displaycatalog.mp.microsoft.com/);
  assert.equal(productUrl('sony', 'https://store.playstation.com/en-us/concept/10001130').request, 'https://store.playstation.com/en-us/concept/10001130');
  for (const [provider, url] of [['sony', 'https://evil.com/en-us/concept/1'], ['sony', 'https://store.playstation.com@evil.com/en-us/concept/1'], ['sony', 'https://store.playstation.com:8443/en-us/concept/1'], ['xbox', 'http://www.xbox.com/game/9N4W31HSMVVD'], ['xbox', 'https://www.xbox.com/search'], ['other', 'https://example.com']]) assert.throws(() => productUrl(provider, url));
});
test('Xbox preserves independent descriptions and removes HTML', () => {
  const result = parseXbox({ Product: { LocalizedProperties: [{ Language: 'en-US', ProductTitle: 'Game', ProductDescription: '<p>Full &amp; complete</p>', ShortDescription: 'Short' }] } });
  assert.equal(result.description, 'Full & complete');
  assert.equal(result.short_description, 'Short');
  assert.equal(result.short_source, 'provider');
});
test('Sony uses only Product structured data and labels derived short descriptions', () => {
  const html = '<script type="application/ld+json">' + JSON.stringify({ '@graph': [{ '@type': 'Organization', description: 'Wrong' }, { '@type': 'Product', name: 'Game', description: 'Opening.\n\nMore details.' }] }) + '</script>';
  const result = parseSony(html);
  assert.equal(result.description, 'Opening.\n\nMore details.');
  assert.equal(result.short_description, 'Opening.');
  assert.equal(result.short_source, 'excerpt');
  assert.throws(() => parseSony('<html>blocked</html>'));
});
test('provider errors are surfaced and redirects are disallowed', async () => {
  await assert.rejects(descriptions('sony', 'https://store.playstation.com/en-us/concept/1', async (url, options) => {
    assert.equal(options.redirect, 'error');
    return { ok: false, status: 403 };
  }), error => error.status === 502);
});

test('Steam reads About This Game and independent short text without an API key', async () => {
  const calls = [];
  const result = await descriptions('steam', 'https://store.steampowered.com/app/1091500/Cyberpunk_2077/', async (url, options) => {
    calls.push(url); assert.equal(options.redirect, 'error'); assert.equal(options.headers?.Authorization, undefined);
    return new Response(JSON.stringify({ 1091500: { success: true, data: { steam_appid: 1091500, type: 'game', name: 'Cyberpunk 2077', about_the_game: '<h2>About the game</h2><p>Explore Night City.</p>', detailed_description: 'Purchase bonuses. Wrong text.', short_description: 'An open-world RPG.' } } }));
  });
  assert.match(calls[0], /appdetails\?appids=1091500/); assert.equal(result.provider, 'steam');
  assert.ok(result.description.includes('Explore Night City.')); assert.ok(!result.description.includes('Purchase bonuses'));
  assert.equal(result.short_description, 'An open-world RPG.'); assert.equal(result.short_source, 'provider');
});

test('Steam searches by exact title when no link exists and rejects DLC or unsafe links', async () => {
  const result = await resolveDescription({ provider: 'steam', title: 'Cyberpunk 2077' }, async url => {
    if (url.includes('storesearch')) return new Response(JSON.stringify({ items: [{ id: 1091500, name: 'Cyberpunk 2077' }, { id: 2, name: 'Unrelated game' }] }));
    return new Response(JSON.stringify({ 1091500: { success: true, data: { steam_appid: 1091500, type: 'game', name: 'Cyberpunk 2077', detailed_description: 'Full game introduction.' } } }));
  });
  assert.equal(result.description, 'Full game introduction.'); assert.equal(result.short_source, 'excerpt');
  await assert.rejects(descriptions('steam', result.url, async () => new Response(JSON.stringify({ 1091500: { success: true, data: { steam_appid: 1091500, type: 'dlc' } } }))), { status: 409 });
  for (const url of ['https://store.steampowered.com.evil.test/app/1', 'http://store.steampowered.com/app/1', 'https://store.steampowered.com/sub/1', 'https://store.steampowered.com:8443/app/1']) assert.throws(() => productUrl('steam', url), { status: 400 });
});

test('missing GTA VI on Steam never selects Vice City or blames the entered title', async () => {
  const calls = [];
  await assert.rejects(byTitle('steam', 'Grand Theft Auto VI', async url => {
    calls.push(url);
    return new Response(JSON.stringify({ items: [{ id: 1546990, name: 'Grand Theft Auto: Vice City – The Definitive Edition' }] }));
  }), error => error.status === 404 && error.message.includes('در Steam عرضه نشده') && !error.message.includes('نام کامل'));
  assert.equal(calls.length, 1);
});

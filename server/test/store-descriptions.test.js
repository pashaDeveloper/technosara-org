const { test } = require('node:test');
const assert = require('node:assert/strict');
const { productUrl, parseXbox, parseSony, descriptions } = require('../services/storeDescriptions.service');
const { selectTitle, byTitle } = require('../services/storeDescriptions.service');
const { resolveDescription } = require('../services/storeDescriptions.service');

test('ambiguous cover lookup exposes distinct products for manual selection', async () => {
  await assert.rejects(byTitle('sony', 'Example Game', async () => new Response(JSON.stringify({ links: [
    { id: 'GAME-PS4', name: 'Example Game' },
    { id: 'GAME-PS5', name: 'Example Game' },
    { id: 'GAME-PS4', name: 'Example Game' },
  ] }))), error => {
    assert.equal(error.status, 409);
    assert.deepEqual(error.candidates, [
      { title: 'Example Game', url: 'https://store.playstation.com/en-us/product/GAME-PS4' },
      { title: 'Example Game', url: 'https://store.playstation.com/en-us/product/GAME-PS5' },
    ]);
    return true;
  });
});

test('an unusable saved URL falls back to title lookup', async () => {
  const result = await resolveDescription({ provider: 'sony', title: 'last of us', url: 'https://invalid.example/game' }, async url => {
    if (url.includes('/tumbler/')) return new Response(JSON.stringify({ links: [{ id: 'UP9000-GAME', name: 'The Last of Us' }] }));
    return new Response('<script type="application/ld+json">' + JSON.stringify({ '@type': 'Product', name: 'The Last of Us', description: 'Game description.' }) + '</script>');
  });
  assert.equal(result.description, 'Game description.');
});

test('Sony retries a punctuated title as search terms and matches the exact game', async () => {
  const title = 'Uncharted: Legacy of Thieves Collection';
  const product = 'UP9000-PPSA05389_00-UNCHARTED4R00000';
  const queries = [];
  const result = await byTitle('sony', title, async url => {
    if (url.includes('/tumbler/')) {
      const terms = decodeURIComponent(new URL(url).pathname.split('/').at(-1));
      queries.push(terms);
      return Response.json({ links: terms.includes(':') ? [] : [
        { id: 'OTHER-EDITION', name: 'Uncharted: The Lost Legacy' },
        { id: product, name: title.toUpperCase() },
      ] });
    }
    assert.equal(url, `https://store.playstation.com/en-us/product/${product}`);
    return new Response('<script type="application/ld+json">' + JSON.stringify({ '@type': 'Product', name: title, description: 'Game description.' }) + '</script>');
  });
  assert.deepEqual(queries, [title, 'uncharted legacy of thieves collection']);
  assert.equal(result.title, title);
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

test('PlayStation lookup combines the title and PPSA code across regions', async () => {
  const product = 'HP5846-PPSA38625_00-GOBBLE0000000000';
  const result = await resolveDescription({ provider: 'sony', title: 'Gobble PPSA38625' }, async url => {
    if (url.includes('/tumbler/US/')) return Response.json({ links: [{ id: 'OTHER-PRODUCT', name: 'Gobble' }] });
    if (url.includes('/tumbler/HK/')) return Response.json({ links: [{ id: product, name: 'GOBBLE' }] });
    assert.equal(url, `https://store.playstation.com/en-hk/product/${product}`);
    return new Response('<script type="application/ld+json">{"@type":"Product","name":"GOBBLE","description":"Game description."}</script>');
  });
  assert.equal(result.title, 'GOBBLE');
  assert.match(result.url, /en-hk/);
});

test('video lookup separates labeled gameplay from trailers and accepts Steam streams', async t => {
  const steam = require('../services/steamDlc.service');
  const { read } = require('../services/gameVideoSources.service');
  t.mock.method(steam, 'details', async () => ({ type: 'game', movies: [
    { name: 'Gameplay showcase', mp4: { max: 'https://example.com/gameplay.mp4' } },
    { name: 'Launch trailer', hls_h264: 'https://example.com/trailer.m3u8', thumbnail: 'https://example.com/trailer.jpg' },
  ] }));
  const input = { title: 'Game', store_urls: ['https://store.steampowered.com/app/123/'] };
  assert.deepEqual((await read({ ...input, kind: 'gameplay' })).map(row => [row.title, row.direct]), [['Gameplay showcase', true]]);
  assert.deepEqual((await read({ ...input, kind: 'trailer' })).map(row => [row.title, row.direct, row.thumbnail]), [['Launch trailer', false, 'https://example.com/trailer.jpg']]);
});

test('one source video appears in only one category despite alternate YouTube URLs', async t => {
  const steam = require('../services/steamDlc.service');
  const gamebrain = require('../services/gamebrain.service');
  const { read } = require('../services/gameVideoSources.service');
  t.mock.method(steam, 'details', async () => ({ type: 'game', movies: [] }));
  t.mock.method(gamebrain, 'details', async () => ({
    gameplay: 'https://youtu.be/abcdefghijk?t=10',
    trailer: 'https://www.youtube.com/watch?v=abcdefghijk',
  }));
  const input = { title: 'Game', gamebrain_id: 1, store_urls: ['https://store.steampowered.com/app/123/'] };
  assert.equal((await read({ ...input, kind: 'gameplay' })).length, 1);
  assert.deepEqual(await read({ ...input, kind: 'trailer' }), []);
});

test('manual PPSA lookup can resolve and verify an official product without the game title', async () => {
  const product = 'JP0101-PPSA15304_00-MGSDELTAMAINGAME';
  const result = await resolveDescription({ provider: 'sony', product_id: 'ppsa15304' }, async url => {
    if (url === 'https://prosperopatches.com/PPSA15304') return new Response(`<h1>Metal Gear Solid Delta</h1><p>${product}</p>`);
    assert.equal(url, `https://store.playstation.com/ja-jp/product/${product}`);
    return new Response('<script type="application/ld+json">{"@type":"Product","name":"Metal Gear Solid Delta","description":"Game description."}</script>');
  });
  assert.equal(result.title, 'Metal Gear Solid Delta');
  assert.match(result.url, /PPSA15304/);
});

test('manual Xbox ID opens the exact product without title search', async () => {
  const result = await resolveDescription({ provider: 'xbox', product_id: '9nnx1vvr3knq' }, async url => {
    assert.match(url, /\/products\/9NNX1VVR3KNQ\?/);
    return Response.json({ Product: { LocalizedProperties: [{ ProductTitle: 'Forza Horizon 5', ProductDescription: 'Description.' }] } });
  });
  assert.equal(result.title, 'Forza Horizon 5');
  assert.match(result.url, /9NNX1VVR3KNQ$/);
});

test('partial game-name search returns exact selectable titles with official product URLs', async () => {
  const { suggestTitles } = require('../services/storeDescriptions.service');
  const rows = await suggestTitles('Forza Horizon', async url => {
    if (url.includes('displaycatalog')) return Response.json({ Products: [
      { ProductId: '9NNX1VVR3KNQ', LocalizedProperties: [{ ProductTitle: 'Forza Horizon 5' }] },
    ] });
    return Response.json({ links: [] });
  });
  assert.deepEqual(rows, [{ title: 'Forza Horizon 5', url: 'https://www.xbox.com/en-US/games/store/game/9NNX1VVR3KNQ', provider: 'xbox' }]);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { xboxImages, sonyImages, read } = require('../services/gameMedia.service');

test('Xbox square tile candidates are included and separated from banners', () => {
  const result = xboxImages({ Product: { LocalizedProperties: [{ Language: 'en-US', ProductTitle: 'Game', Images: [
    { ImagePurpose: 'SquareTitle', Uri: '//images.example.com/square.jpg' },
    { ImagePurpose: 'BoxArt', Uri: 'https://images.example.com/portrait.jpg' },
    { ImagePurpose: 'SuperHeroArt', Uri: 'https://images.example.com/banner.jpg' },
    { ImagePurpose: 'Tile', Uri: 'javascript:invalid' },
  ] }] } });
  assert.deepEqual(result.card_images, ['https://images.example.com/square.jpg', 'https://images.example.com/portrait.jpg']);
  assert.deepEqual(result.banner_images, ['https://images.example.com/banner.jpg']);
});

test('Sony product images support selecting a card without including its banner', () => {
  const html = '<script type="application/ld+json">' + JSON.stringify({ '@type': 'Product', name: 'Game', image: ['https://images.example.com/card.jpg', 'javascript:invalid'] }) + '</script>';
  assert.deepEqual(sonyImages(html, 'https://store.playstation.com/en-us/product/TEST'), { title: 'Game', videos: [], card_images: ['https://images.example.com/card.jpg'], banner_images: [] });
});

test('Xbox screenshots use the selected product and exclude other artwork', async () => {
  const url = 'https://www.xbox.com/en-US/games/store/game/9MX6HKF5647G';
  const result = await read({ provider: 'xbox', url, media: 'screenshots' }, async (request) => {
    assert.equal(new URL(request).pathname, '/v7.0/products/9MX6HKF5647G');
    return Response.json({ Product: { LocalizedProperties: [{ Language: 'en-US', ProductTitle: 'Borderlands 4', Images: [
      { ImagePurpose: 'Screenshot', Uri: '//images.example.com/screenshot.jpg' },
      { ImagePurpose: 'Screenshot', Uri: 'https://images.example.com/screenshot.jpg' },
      { ImagePurpose: 'BoxArt', Uri: 'https://images.example.com/box.jpg' },
    ] }] } });
  });
  assert.deepEqual(result.screenshots, ['https://images.example.com/screenshot.jpg']);
  assert.equal(result.source_url, url);
});

test('media source rejects untrusted product links before fetching', async () => {
  await assert.rejects(read({ provider: 'xbox', url: 'https://example.com/ABCDEFGHIJKL' }, () => { throw new Error('must not fetch'); }), error => error.status === 400);
});

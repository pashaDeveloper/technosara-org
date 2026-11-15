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
  assert.deepEqual(sonyImages(html, 'https://store.playstation.com/en-us/product/TEST'), { title: 'Game', card_images: ['https://images.example.com/card.jpg'], banner_images: [] });
});

test('media source rejects untrusted product links before fetching', async () => {
  await assert.rejects(read({ provider: 'xbox', url: 'https://example.com/ABCDEFGHIJKL' }, () => { throw new Error('must not fetch'); }), error => error.status === 400);
});

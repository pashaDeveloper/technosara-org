const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const service = require('../services/consoleDlc.service');
const Content = require('../models/gameContent.model');
const Game = require('../models/game.model');
const Product = require('../models/storeProduct.model');
const Store = require('../models/store.model');
const parentId = 'C496CLVXMJP8', childId = 'C22JNR2SLS6T';
const sonyId = 'UP1004-PPSA03420_00-GTAVPS5CASHPLUS6';
const input = { official_stores: [{ url: `https://www.xbox.com/en-US/games/store/game/${parentId}` }, { url: 'https://store.playstation.com/en-us/concept/201930' }] };
const sonyRow = { id: sonyId, concept: { id: '201930' }, name: 'Shark card', boxArt: { url: 'https://image.api.playstation.com/card.png' }, price: { discountedPrice: '$99.99', basePrice: '$99.99' } };
const sonyProduct = { __typename: 'Product', id: sonyId, name: 'Shark card', descriptions: [{ type: 'LONG', value: 'Full description' }], storeDisplayClassification: 'VIRTUAL_CURRENCY', releaseDate: '2022-03-29T09:00:00Z' };
function sonyHtml(product = sonyProduct) {
  return `<script type="application/json">${JSON.stringify({ cache: { [`Product:${sonyId}`]: product, 'Concept:201930': { __typename: 'Concept', id: '201930', name: 'Grand Theft Auto V' } } })}</script>`;
}
const xboxProduct = { ProductId: childId, ProductKind: 'Durable', LocalizedProperties: [{ Language: 'en-US', ProductTitle: 'Starter Pack', ProductDescription: 'Complete starter pack description', Images: [{ ImagePurpose: 'BoxArt', Uri: '//store-images.microsoft.com/image/box' }] }], DisplaySkuAvailabilities: [{ Availabilities: [{ OrderManagementData: { Price: { ListPrice: 9.99, MSRP: 19.99, CurrencyCode: 'USD' } } }] }] };
function fixture({ xboxPages, sonyPages, sonyProductOverride } = {}) {
  const calls = [];
  const fetcher = async (value, options = {}) => {
    const u = new URL(value); calls.push({ u, options });
    let body;
    if (u.hostname === 'emerald.xboxservices.com') {
      assert.equal(options.headers['X-MS-API-Version'], '1.1');
      assert.ok(options.headers['MS-CV']);
      const request = JSON.parse(options.body), token = request.EncodedCT || '';
      body = xboxPages?.[token] || { channels: { [`ProductAddOns_${parentId}`]: { title: 'Add-ons for this game', products: [{ productId: childId }], totalItems: 1 } }, productSummaries: [{ productId: childId, title: 'Starter Pack', images: { boxArt: { url: 'https://example.com/box' } } }] };
    } else if (u.hostname === 'displaycatalog.mp.microsoft.com') body = { Product: xboxProduct };
    else if (u.hostname === 'store.playstation.com') return new Response(sonyHtml(sonyProductOverride));
    else if (u.hostname === 'web.np.playstation.com') {
      assert.equal(options.headers['Content-Type'], 'application/json');
      assert.equal(JSON.parse(u.searchParams.get('extensions')).persistedQuery.sha256Hash, service.SONY_ADDONS_HASH);
      const offset = JSON.parse(u.searchParams.get('variables')).pageArgs.offset;
      body = { data: { addOnProductsRetrieve: { addOnProducts: sonyPages?.[offset] || [sonyRow] } } };
    } else throw new Error('Unexpected host: ' + u.hostname);
    return new Response(JSON.stringify(body));
  };
  return { fetcher, calls };
}
test('only accepts official HTTPS product links, deduplicating cloud and store URLs', () => {
  assert.equal(service.sourceLink('https://www.xbox.com/en-US/play/games/XXX/' + parentId).id, parentId);
  for (const url of ['https://www.xbox.com.evil.test/game/' + parentId, 'https://user:pass@www.xbox.com/game/' + parentId, 'http://www.xbox.com/game/' + parentId]) assert.equal(service.sourceLink(url), null);
  assert.equal(service.inputLinks({ offers: [{ url: input.official_stores[0].url }], ...input }).length, 2);
});
test('discovers real-shaped Xbox and Sony responses independently of Steam', async () => {
  const { fetcher, calls } = fixture();
  const result = await service.discoverDraft(input, fetcher);
  assert.equal(result.list_complete, true);
  assert.deepEqual(result.items.map(row => row.key), [`xbox:${childId}`, `playstation:${sonyId}`]);
  assert.equal(result.items[0].image, 'https://example.com/box');
  assert.ok(calls.every(call => !call.u.hostname.includes('steam')));
});
test('Xbox follows continuation tokens and rejects silently truncated or failed channels', async () => {
  const key = `ProductAddOns_${parentId}`, source = service.sourceLink(input.official_stores[0].url);
  const { fetcher } = fixture({ xboxPages: {
    '': { channels: { [key]: { products: [{ productId: childId }], totalItems: 2, encodedCT: 'next' } } },
    next: { channels: { [key]: { products: [{ productId: 'BXVNQM8BN2X3' }], totalItems: 2 } } },
  } });
  assert.equal((await service.xboxList(source, fetcher)).rows.length, 2);
  await assert.rejects(service.xboxList(source, fixture({ xboxPages: { '': { channels: { [key]: { products: [], totalItems: 10 } } } } }).fetcher), { status: 502 });
  await assert.rejects(service.xboxList(source, fixture({ xboxPages: { '': { channels: { [key]: { title: 'Failed to Get Channel', products: [], totalItems: 0 } } } } }).fetcher), { status: 502 });
});
test('Sony fetches subsequent pages and rejects repeated pages or unrelated concepts', async () => {
  const source = service.sourceLink(input.official_stores[1].url);
  const first = Array.from({ length: 48 }, (_, i) => ({ ...sonyRow, id: 'UP1004-PPSA03420_00-CONTENT' + i }));
  const result = await service.sonyList(source, fixture({ sonyPages: { 0: first, 48: [sonyRow] } }).fetcher);
  assert.equal(result.rows.length, 49);
  await assert.rejects(service.sonyList(source, fixture({ sonyPages: { 0: first, 48: first } }).fetcher), { status: 502 });
  await assert.rejects(service.sonyList(source, fixture({ sonyPages: { 0: [{ ...sonyRow, concept: { id: 'wrong' } }] } }).fetcher), { status: 502 });
});
test('a failed source is reported while valid source results are retained', async () => {
  const key = `ProductAddOns_${parentId}`;
  const result = await service.discoverDraft(input, fixture({ xboxPages: { '': { channels: { [key]: { title: 'Failed to Get Channel', products: [], totalItems: 0 } } } } }).fetcher);
  assert.equal(result.list_complete, false);
  assert.equal(result.errors[0].provider, 'xbox');
  assert.equal(result.items[0].provider, 'playstation');
});
test('full details verify membership, preserve raw data, prices, media and real content classifications', async () => {
  const xbox = await service.previewOne({ ...input, provider: 'xbox', app_id: childId, parent_app_id: parentId }, fixture().fetcher);
  assert.equal(xbox.content.description, xboxProduct.LocalizedProperties[0].ProductDescription);
  assert.equal(xbox.content.image, 'https://store-images.microsoft.com/image/box');
  assert.equal(xbox.price.value, 9.99);
  const sony = await service.previewOne({ ...input, provider: 'playstation', app_id: sonyId, parent_app_id: 'concept/201930' }, fixture().fetcher);
  assert.equal(sony.content.type, 'currency');
  assert.equal(sony.content.description, 'Full description');
  assert.equal(sony.price.value, 99.99);
  await new Content({ ...sony.content, game_id: new mongoose.Types.ObjectId() }).validate();
  await assert.rejects(service.previewOne({ ...input, provider: 'xbox', app_id: 'AAAAAAAAAAAA', parent_app_id: parentId }, fixture().fetcher), { status: 409 });
});
test('imports into GameContent and StoreProduct once and preserves manual edits on refresh', async t => {
  t.mock.method(require('../services/automaticMedia.service'), 'enrich', async content => Object.assign(content, { description: 'توضیحات فارسی افزونه' }));
  const gameId = new mongoose.Types.ObjectId(), storeId = new mongoose.Types.ObjectId();
  let content, product, creations = 0;
  t.mock.method(Game, 'findById', () => ({ lean: async () => ({ _id: gameId, ...input }) }));
  t.mock.method(Store, 'findOne', async () => ({ _id: storeId }));
  t.mock.method(Content, 'findOne', () => ({ setOptions: async () => content }));
  t.mock.method(Content, 'findById', () => ({ setOptions: async () => content }));
  t.mock.method(Product, 'findOne', () => ({ setOptions: async () => product }));
  t.mock.method(Content.prototype, 'save', async function () { await this.validate(); content = this; return this; });
  t.mock.method(Product.prototype, 'save', async function () { await this.validate(); return this; });
  t.mock.method(Product, 'findOneAndUpdate', async (_, update) => { creations++; product = new Product(update.$setOnInsert); return product; });
  const body = { provider: 'xbox', app_id: childId, parent_app_id: parentId };
  assert.equal((await service.importOne(gameId, body, null, fixture().fetcher)).created, true);
  assert.equal(content.publication_status, 'draft');
  assert.equal(content.description, 'توضیحات فارسی افزونه');
  assert.equal(content.source_data.provider, 'xbox');
  content.title = 'Manual';
  assert.equal((await service.importOne(gameId, body, null, fixture().fetcher)).created, false);
  assert.equal(content.title, 'Manual');
  assert.equal(creations, 1);
});

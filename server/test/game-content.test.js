const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Game = require('../models/game.model');
const Edition = require('../models/edition.model');
const Content = require('../models/gameContent.model');
const service = require('../services/catalog.service');
const { validateGameIdentity } = require('../utils/gameIdentity');
const { validateContentReferences } = require('../utils/contentReferences');
const id = () => new mongoose.Types.ObjectId();
const make = (values = {}) => new Content({ title: 'Content', slug: 'content', type: 'bundle', ...values });

test('base edition flag is restricted and items reject null, self and invalid game links', async () => {
  assert.equal(Content.schema.path('is_base_edition'), undefined);
  await assert.rejects(new Edition({ name: 'Base', slug: 'base' }).validate());
  await new Edition({ name: 'Base', slug: 'base', game_id: id(), is_base_edition: true }).validate();
  await assert.rejects(make({ type: 'edition', game_id: id() }).validate());
  await assert.rejects(make({ items: null }).validate());
  await assert.rejects(make({ items: [null] }).validate());
  const self = make();
  self.items = [{ content_id: self._id }];
  await assert.rejects(self.validate());
  await assert.rejects(make({ type: 'edition', game_id: id(), items: [{ game_id: id() }] }).validate());
  await assert.rejects(make({ type: 'season_pass', game_id: id(), items: [{ game_id: id() }] }).validate());
  assert.ok(Edition.schema.indexes().some(([keys, options]) => keys.game_id === 1 && options.unique && options.partialFilterExpression?.is_base_edition === true));
});

test('store identifiers live on StoreProduct with exactly one local target', async () => {
  const Product = require('../models/storeProduct.model');
  const fields = { store_id: id(), provider: 'steam', external_product_id: '001234' };
  await assert.rejects(new Product(fields).validate());
  await assert.rejects(new Product({ ...fields, game_id: id(), content_id: id() }).validate());
  for (const provider of ['steam', 'xbox', 'playstation']) {
    const product = new Product({ ...fields, provider, content_id: id() });
    await product.validate();
    assert.equal(product.external_product_id, '001234');
  }
  await new Product({ ...fields, edition_id: id() }).validate();
  await assert.rejects(new Product({ ...fields, edition_id: id(), content_id: id() }).validate());
  assert.equal(Game.schema.path('release_status'), undefined);
  assert.equal(Game.schema.path('external_product_id'), undefined);
  assert.equal(Content.schema.path('external_product_id'), undefined);
});

test('base games remain separate and non-bundle content requires a game', async () => {
  assert.equal(Game.schema.path('content_type'), undefined);
  await assert.rejects(validateGameIdentity({ content_type: 'dlc' }), { status: 400 });
  await assert.rejects(make({ type: 'dlc' }).validate());
  await make({ type: 'expansion', game_id: id() }).validate();
  await make().validate();
});
test('items require exactly one reference and no duplicates; ordinary content cannot contain items', async () => {
  await assert.rejects(make({ items: [{}] }).validate());
  await assert.rejects(make({ items: [{ game_id: id(), content_id: id() }] }).validate());
  const item = { game_id: id() };
  await assert.rejects(make({ items: [item, item] }).validate());
  await assert.rejects(make({ type: 'dlc', game_id: id(), items: [item] }).validate());
});
test('season pass enforces same game; bundle supports multiple games; cycles and missing items are rejected', async t => {
  const game = id(), other = id(), child = id();
  t.mock.method(Content, 'findById', async () => ({ _id: child, game_id: other, type: 'dlc', items: [] }));
  await assert.rejects(validateContentReferences(make({ type: 'season_pass', game_id: game, items: [{ content_id: child }] })), /same game/);
  await validateContentReferences(make({ items: [{ content_id: child }] }));
  const bundle = make({ items: [{ content_id: child }] });
  t.mock.method(Content, 'findById', async key => String(key) === String(child) ? { _id: child, items: [{ content_id: bundle._id }] } : bundle);
  await assert.rejects(validateContentReferences(bundle), /cycle/);
  t.mock.method(Content, 'findById', async () => null);
  await assert.rejects(validateContentReferences(bundle), /not found/);
});
test('deletion protects embedded references', async t => {
  t.mock.method(Content, 'exists', async query => query['items.content_id'] ? { _id: id() } : null);
  await assert.rejects(service.assertDeletable(Content, id()), { status: 409 });
});

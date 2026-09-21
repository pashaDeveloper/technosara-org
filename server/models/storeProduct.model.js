const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');

const schema = new mongoose.Schema({
  ...baseSchema.obj,
  game_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  platform_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Platform',
    required: true
  },
  external_product_id: {
    type: String,
    required: true,
    trim: true
  },
  external_sku_id: {
    type: String,
    trim: true,
    default: null
  },
  external_title_id: {
    type: String,
    trim: true,
    default: null
  },
  product_type: {
    type: String,
    trim: true,
    required: true
  },
  store_title: {
    type: String,
    trim: true,
    required: true
  },
  store_url: {
    type: String,
    trim: true,
    default: null
  },
  market: {
    type: String,
    trim: true,
    default: null
  },
  region: {
    type: String,
    trim: true,
    default: null
  },
  is_available: {
    type: Boolean,
    default: false
  },
  is_preorder: {
    type: Boolean,
    default: false
  },
  is_trial: {
    type: Boolean,
    default: false
  },
  release_date: {
    type: Date,
    default: null
  },
  raw_source_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  last_synced_at: {
    type: Date,
    default: null
  },
}, {
  collection: 'store_products',
  timestamps: true
});

schema.index({ game_id: 1, store_id: 1, platform_id: 1 });
schema.index({ store_id: 1, external_product_id: 1 });
schema.index({ platform_id: 1 });

module.exports = mongoose.model('StoreProduct', schema);

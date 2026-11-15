const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');
const priceSchema = new mongoose.Schema({
  value: {
    type: Number,
    min: 0
  },
  initial: {
    type: Number,
    min: 0
  },
  currency: {
    type: String,
    trim: true
  },
  discount_percent: {
    type: Number,
    min: 0,
    max: 100
  }
}, {
  _id: false
});
const schema = new mongoose.Schema({
  ...baseSchema.obj,
  source: {
    type: String,
    trim: true,
    default: undefined
  },
  platform_name: {
    type: String,
    trim: true,
    default: undefined
  },
  price: {
    type: priceSchema,
    default: undefined
  },
  is_official: {
    type: Boolean,
    default: undefined
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  game_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    default: null
  },
  content_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameContent',
    default: null
  },
  edition_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Edition',
    default: null
  },
  provider: {
    type: String,
    enum: ['steam', 'xbox', 'playstation', 'other'],
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
    default: ''
  },
  external_title_id: {
    type: String,
    trim: true,
    default: ''
  },
  store_title: {
    type: String,
    trim: true,
    default: ''
  },
  store_url: {
    type: String,
    trim: true,
    default: '',
    validate: value => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
      } catch {
        return false;
      }
    }
  }
}, {
  timestamps: true,
  collection: 'store_products'
});
schema.pre('validate', function () {
  if ([this.game_id, this.content_id, this.edition_id].filter(Boolean).length !== 1) {
    this.invalidate('game_id', 'A store product must reference exactly one game, content or edition');
  }
});
schema.index({
  store_id: 1,
  provider: 1,
  external_product_id: 1,
  external_sku_id: 1
}, {
  unique: true
});
schema.index({
  game_id: 1
});
schema.index({
  content_id: 1
});
schema.index({
  edition_id: 1
});
module.exports = mongoose.model('StoreProduct', schema);

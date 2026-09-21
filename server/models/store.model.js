const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');

const schema = new mongoose.Schema({
  ...baseSchema.obj,
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  short_name: {
    type: String,
    trim: true,
    default: ''
  },
  provider: {
    type: String,
    trim: true,
    default: null
  },
  store_type: {
    type: String,
    trim: true,
    default: null
  },
  website_url: {
    type: String,
    trim: true,
    default: null
  },
  product_url_template: {
    type: String,
    trim: true,
    default: null
  },
  logo_url: {
    type: String,
    trim: true,
    default: null
  },
  icon_url: {
    type: String,
    trim: true,
    default: null
  },
  api_available: {
    type: Boolean,
    default: false
  },
  api_base_url: {
    type: String,
    trim: true,
    default: null
  },
  api_version: {
    type: String,
    trim: true,
    default: null
  },
  auth_type: {
    type: String,
    trim: true,
    default: null
  },
  supports_prices: {
    type: Boolean,
    default: false
  },
  supports_dlc: {
    type: Boolean,
    default: false
  },
  supports_achievements: {
    type: Boolean,
    default: false
  },
  supports_subscriptions: {
    type: Boolean,
    default: false
  },
  supports_reviews: {
    type: Boolean,
    default: false
  },
  default_currency: {
    type: String,
    trim: true,
    uppercase: true,
    default: null
  },
  default_region: {
    type: String,
    trim: true,
    uppercase: true,
    default: null
  },
  sort_order: {
    type: Number,
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  },
  deleted_at: {
    type: Date,
    default: null
  },
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

schema.remove(['createdAt', 'updatedAt', 'deletedAt']);

module.exports = mongoose.model('Store', schema);

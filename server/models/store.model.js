const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');
const {
  countryCodes
} = require('../utils/country.util');
const schema = new mongoose.Schema({
  ...baseSchema.obj,
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 100,
    match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  },
  name: {
    type: String,
    required: function () {
      return !this.name_en;
    },
    trim: true
  },
  name_en: {
    type: String,
    trim: true,
    default: null
  },
  image: {
    type: String,
    default: '',
    validate: {
      validator: value => !value || require('../utils/catalogImage').localImage(value) || require('validator').isURL(value, {
        protocols: ['https'],
        require_protocol: true
      }) || Buffer.byteLength(value) <= 7 * 1024 * 1024 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value),
      message: 'عکس باید PNG، JPEG یا WebP با حجم حداکثر ۵ مگابایت باشد.'
    }
  },
  description: {
    type: String,
    default: ''
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
  country_code: {
    type: String,
    trim: true,
    uppercase: true,
    enum: [...countryCodes, null],
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
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});
schema.remove(['createdAt', 'updatedAt', 'deletedAt']);
schema.plugin(require('../utils/catalogImage').catalogImage);
schema.add({
  name_fa: {
    type: String,
    trim: true,
    default: undefined
  }
});
module.exports = mongoose.model('Store', schema);

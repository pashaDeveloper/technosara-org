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

  brand_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    default: null
  },
  device_type: {
    type: String,
    enum: ['console', 'pc', 'handheld', 'mobile', 'cloud'],
    required: true,
  },
  generation: {
    type: Number,
    min: 1,
    default: null,
    validate: {
      validator: value => value == null || Number.isInteger(value),
      message: 'Generation must be an integer'
    }
  },
  parent_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Platform',
    default: null
  },
  release_date: {
    type: Date,
    default: null
  },
  discontinued_date: {
    type: Date,
    default: null
  },
  // SVG markup stored as text.
  icon: {
    type: String,
    trim: true,
    default: null
  },
  logo: {
    type: String,
    trim: true,
    default: null
  },
  website_url: {
    type: String,
    trim: true,
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
}, {
  timestamps: true
});

schema.path('parent_id').validate(function (value) {
  return value == null || !value.equals(this._id);
}, 'A platform cannot be its own parent');

schema.add({ slug: { type: String, trim: true, lowercase: true, default: undefined, index: { unique: true, sparse: true } } });
schema.plugin(require('../utils/catalogImage').catalogImage, { category: 'platforms', field: 'logo' });
module.exports = mongoose.model('Platform', schema);

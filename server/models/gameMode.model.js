const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');
const schema = new mongoose.Schema({
  ...baseSchema.obj,
  value: {
    type: String,
    trim: true,
    default: undefined
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  name_en: {
    type: String,
    trim: true,
    default: null
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  thumbnail: { type: String, trim: true, default: null },
  preview: { type: String, trim: true, default: null },
  description: {
    type: String,
    default: ''
  },
  sort_order: {
    type: Number,
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  collection: 'game_modes',
  timestamps: true
});
schema.index({
  value: 1
}, {
  unique: true,
  partialFilterExpression: {
    value: {
      $type: 'string'
    }
  }
});
module.exports = mongoose.model('GameMode', schema);

const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');
const schema = new mongoose.Schema({
  ...baseSchema.obj,
  name: {
    type: String,
    trim: true,
    required: true
  },
  name_en: {
    type: String,
    trim: true,
    default: undefined
  },
  slug: {
    type: String,
    trim: true,
    required: true
  },
  value: {
    type: String,
    trim: true,
    default: undefined
  },
  description: {
    type: String,
    default: undefined
  }
}, {
  timestamps: true,
  collection: 'release_windows'
});
schema.index({
  slug: 1
}, {
  unique: true
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
module.exports = mongoose.model('ReleaseWindow', schema);

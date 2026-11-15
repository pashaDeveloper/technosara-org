const mongoose = require('mongoose');
const { generateSlug } = require('../utils/slug');
const schema = new mongoose.Schema({
  ...require('./baseSchema.model').obj,
  name: {
    type: String,
    trim: true,
    required: true
  },
  // GameBrain themes are { value, name }; other fields are local metadata.
  value: { type: String, trim: true, default: undefined },
  name_en: {
    type: String,
    trim: true,
    default: undefined
  },
  slug: {
    type: String,
    default: function () { return generateSlug(this.name_en || this.name); },
    trim: true,
    lowercase: true,
    required: true,
    unique: true
  },
  description: {
    type: String,
    default: undefined
  }
}, {
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
module.exports = mongoose.model('Theme', schema);

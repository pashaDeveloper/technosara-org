const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');
const schema = new mongoose.Schema({
  ...baseSchema.obj,
  game_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    default: ''
  },
  release_date: {
    type: Date,
    default: null
  },
  is_base_edition: {
    type: Boolean,
    required: true,
    default: false
  }
}, {
  timestamps: true,
  collection: 'editions'
});
schema.index({
  game_id: 1,
  slug: 1
}, {
  unique: true
});
schema.index({
  game_id: 1
}, {
  unique: true,
  partialFilterExpression: {
    is_base_edition: true,
    isDeleted: false
  }
});
module.exports = mongoose.model('Edition', schema);

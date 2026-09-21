const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');

const schema = new mongoose.Schema({
  ...baseSchema.obj,
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  sort_title: {
    type: String,
    trim: true,
    default: function () { return this.title; }
  },
  content_type: {
    type: String,
    enum: [
      'base_game',
      'edition',
      'dlc',
      'expansion',
      'season_pass',
      'addon',
      'car_pack',
      'map_pack',
      'character_pack',
      'cosmetic_pack',
      'currency',
      'upgrade',
      'soundtrack',
      'demo',
      'trial',
      'bundle',
      'subscription',
      'other',
    ],
    default: 'base_game',
    required: true,
  },
  parent_game_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    default: null
  },
  short_description: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  release_date: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['released', 'upcoming', 'cancelled'],
    required: true
  },
  official_website: {
    type: String,
    trim: true,
    default: null
  },
  developer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  },
  publisher_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  },
  cover_media_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media',
    default: null
  },
  genre_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Genre'
  }],
}, {
  timestamps: true
});

schema.path('parent_game_id').validate(function (value) {
  return value == null || !value.equals(this._id);
}, 'A game cannot be its own parent');

module.exports = mongoose.model('Game', schema);

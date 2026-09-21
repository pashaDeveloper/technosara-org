const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');

const schema = new mongoose.Schema({
  ...baseSchema.obj,
  game_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  platform_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Platform',
    required: true
  },
  release_date: {
    type: Date,
    default: null
  },
  crossplay: {
    type: Boolean,
    default: false
  },
  cross_save: {
    type: Boolean,
    default: false
  },
  cross_progression: {
    type: Boolean,
    default: false
  },
}, {
  collection: 'game_platforms',
  timestamps: true
});

schema.index({ game_id: 1, platform_id: 1 }, { unique: true });
schema.index({ platform_id: 1 });

module.exports = mongoose.model('GamePlatform', schema);

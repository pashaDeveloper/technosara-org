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
  external_group_id: {
    type: String,
    trim: true,
    default: null
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  group_type: {
    type: String,
    enum: ['base_game', 'dlc', 'expansion', 'update', 'other'],
    default: 'base_game',
    required: true,
  },
  parent_content_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    default: null
  },
  total_achievements: {
    type: Number,
    min: 0,
    default: 0,
    validate: {
      validator: Number.isSafeInteger,
      message: 'Total achievements must be a non-negative safe integer'
    },
  },
  total_points: {
    type: Number,
    min: 0,
    default: 0,
    validate: {
      validator: Number.isFinite,
      message: 'Total points must be finite'
    }
  },
  icon_url: {
    type: String,
    trim: true,
    default: null
  },
}, {
  collection: 'achievement_groups',
  timestamps: true
});

schema.index({ game_id: 1, platform_id: 1 });
schema.index({ parent_content_id: 1 });

module.exports = mongoose.model('AchievementGroup', schema);

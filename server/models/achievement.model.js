const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');

const schema = new mongoose.Schema({
  ...baseSchema.obj,
  game_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  achievement_group_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AchievementGroup',
    required: true
  },
  platform_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Platform',
    required: true
  },
  external_id: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  achievement_type: {
    type: String,
    trim: true,
    default: null
  },
  points: {
    type: Number,
    min: 0,
    default: 0,
    validate: {
      validator: Number.isSafeInteger,
      message: 'Points must be a non-negative safe integer'
    },
  },
  hidden: {
    type: Boolean,
    default: false
  },
  icon_url: {
    type: String,
    trim: true,
    default: null
  },
  rarity: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  is_dlc: {
    type: Boolean,
    default: false
  },
  dlc_game_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    default: null
  },
}, {
  timestamps: true
});

schema.index({ game_id: 1, platform_id: 1 });
schema.index({ achievement_group_id: 1, external_id: 1 }, { unique: true });
schema.index({ dlc_game_id: 1 });

module.exports = mongoose.model('Achievement', schema);

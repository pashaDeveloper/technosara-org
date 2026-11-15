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
  provider: {
    type: String,
    trim: true,
    default: null
  },
  external_set_id: {
    type: String,
    trim: true,
    default: null
  },
  external_product_id: {
    type: String,
    trim: true,
    default: null
  },
  mapping_method: { type: String, enum: ['automatic', 'manual'], default: 'automatic' },
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
    required: true
  },
  dlc_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameContent',
    default: null
  },
  total_achievements: {
    type: Number,
    min: 0,
    default: 0,
    validate: {
      validator: Number.isSafeInteger,
      message: 'Total achievements must be a non-negative safe integer'
    }
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
  }
}, {
  collection: 'achievement_groups',
  timestamps: true
});
schema.index({
  game_id: 1,
  platform_id: 1
});
schema.index({
  dlc_id: 1
});
schema.index({
  provider: 1,
  external_set_id: 1,
  external_group_id: 1
}, {
  unique: true,
  partialFilterExpression: {
    isDeleted: false,
    provider: {
      $type: 'string'
    },
    external_set_id: {
      $type: 'string'
    },
    external_group_id: {
      $type: 'string'
    }
  }
});
module.exports = mongoose.model('AchievementGroup', schema);

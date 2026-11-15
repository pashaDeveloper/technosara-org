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
  locked_description: { type: String, default: '' },
  name_en: { type: String, default: '' },
  name_fa: { type: String, default: '' },
  description_en: { type: String, default: '' },
  description_fa: { type: String, default: '' },
  locked_description_en: { type: String, default: '' },
  locked_description_fa: { type: String, default: '' },
  source_icon_url: { type: String, default: '' },
  preview_url: { type: String, default: '' },
  image_storage: { type: mongoose.Schema.Types.Mixed, default: undefined },
  import_errors: { type: [String], default: [] },
  rarity_category: { type: String, default: null },
  source_achievement_type: { type: String, default: null },
  participation_type: { type: String, default: null },
  estimated_time: { type: String, default: null },
  time_window: {
    start_date: { type: Date, default: null },
    end_date: { type: Date, default: null }
  },
  is_revoked: { type: Boolean, default: false },
  service_config_id: { type: String, default: null },
  source_product_id: { type: String, default: null },
  source_platforms: { type: [String], default: [] },
  deeplink: { type: String, default: null },
  achievement_type: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'standard'],
    default: 'standard'
  },
  points: {
    type: Number,
    min: 0,
    default: null,
    validate: {
      validator: value => value == null || Number.isSafeInteger(value),
      message: 'Points must be a non-negative safe integer'
    }
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
  dlc_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameContent',
    default: null
  }
}, {
  timestamps: true
});
schema.index({
  game_id: 1,
  platform_id: 1
});
schema.index({
  achievement_group_id: 1,
  external_id: 1
}, {
  unique: true
});
schema.index({
  dlc_id: 1
});
module.exports = mongoose.model('Achievement', schema);

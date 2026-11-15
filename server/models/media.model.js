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
    default: null
  },
  pic2: {
    type: String,
    trim: true,
    default: null
  },
  pic1: {
    type: String,
    trim: true,
    default: null
  },
  media_type: {
    type: String,
    enum: ['cover', 'poster', 'hero', 'background', 'logo', 'screenshot', 'thumbnail', 'icon', 'trailer', 'video', 'gameplay'],
    required: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  thumbnail_url: {
    type: String,
    trim: true,
    default: null
  },
  width: {
    type: Number,
    min: 1,
    default: null,
    validate: {
      validator: value => value == null || Number.isSafeInteger(value),
      message: 'Width must be a positive safe integer'
    }
  },
  height: {
    type: Number,
    min: 1,
    default: null,
    validate: {
      validator: value => value == null || Number.isSafeInteger(value),
      message: 'Height must be a positive safe integer'
    }
  },
  language: {
    type: String,
    trim: true,
    default: null
  },
  source: {
    type: String,
    trim: true,
    default: null
  },
  external_id: {
    type: String,
    trim: true,
    default: null
  },
  sort_order: {
    type: Number,
    default: 0
  }
}, {
  collection: 'media',
  timestamps: true
});
schema.index({
  game_id: 1,
  media_type: 1,
  sort_order: 1
});
schema.index({
  game_id: 1,
  platform_id: 1,
  media_type: 1
});
schema.pre('validate', function () {
  if (this.media_type === 'cover' && (this.pic2 || this.pic1)) {
    this.url = this.pic2 || this.pic1;
  }
});
module.exports = mongoose.model('Media', schema);

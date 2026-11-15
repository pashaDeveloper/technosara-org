const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');
const schema = new mongoose.Schema({
  ...baseSchema.obj,
  game_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    default: null,
    required: function () {
      return !['bundle', 'subscription'].includes(this.type);
    }
  },
  type: {
    type: String,
    required: true,
    enum: ['dlc', 'expansion', 'season_pass', 'addon', 'car_pack', 'map_pack', 'character_pack', 'cosmetic_pack', 'currency', 'upgrade', 'soundtrack', 'demo', 'trial', 'bundle', 'subscription', 'other']
  },
  title: {
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
  short_description: { type: String, default: '' },
  title_en: { type: String, default: '' },
  title_fa: { type: String, default: '' },
  description_en: { type: String, default: '' },
  description_fa: { type: String, default: '' },
  short_description_en: { type: String, default: '' },
  short_description_fa: { type: String, default: '' },
  source_image_url: { type: String, default: '' },
  preview_url: { type: String, default: '' },
  image_storage: { type: mongoose.Schema.Types.Mixed, default: undefined },
  screenshot_storage: { type: mongoose.Schema.Types.Mixed, default: undefined },
  import_errors: { type: [String], default: [] },
  image: { type: String, default: '' },
  screenshots: { type: [String], default: [] },
  videos: { type: [String], default: [] },
  developers: { type: [String], default: [] },
  publishers: { type: [String], default: [] },
  supported_languages: { type: String, default: '' },
  platforms: { type: mongoose.Schema.Types.Mixed, default: undefined },
  release_date_text: { type: String, default: '' },
  coming_soon: { type: Boolean, default: false },
  is_free: { type: Boolean, default: undefined },
  requirements: { type: mongoose.Schema.Types.Mixed, default: undefined },
  source_data: { type: mongoose.Schema.Types.Mixed, select: false },
  last_synced_at: { type: Date, default: null },
  release_date: {
    type: Date,
    default: null
  },
  publication_status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  items: {
    type: [new mongoose.Schema({
      game_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
        default: null
      },
      edition_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Edition',
        default: null
      },
      content_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GameContent',
        default: null
      }
    }, {
      _id: false
    })],
    default: [],
    validate: {
      validator: function (items) {
        if (!Array.isArray(items) || items.some(item => !item)) return false;
        if (items.length && !['bundle', 'season_pass', 'subscription'].includes(this.type)) return false;
        if (items.some(item => item.content_id && String(item.content_id) === String(this._id))) return false;
        if (this.type === 'season_pass' && items.some(item => item.game_id || item.edition_id)) return false;
        const keys = items.map(item => (item.game_id ? 'game:' : item.edition_id ? 'edition:' : 'content:') + (item.game_id || item.edition_id || item.content_id));
        return items.every(item => [item.game_id, item.content_id, item.edition_id].filter(Boolean).length === 1) && new Set(keys).size === keys.length;
      },
      message: 'Items require exactly one game or content reference, without duplicates, and a container type'
    }
  }
}, {
  timestamps: true,
  collection: 'game_contents'
});
schema.index({
  game_id: 1,
  type: 1,
  slug: 1
}, {
  unique: true
});
schema.index({
  'items.game_id': 1
});
schema.index({
  'items.content_id': 1
});
schema.index({
  'items.edition_id': 1
});
module.exports = mongoose.model('GameContent', schema);

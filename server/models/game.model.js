const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');
const priceSchema = new mongoose.Schema({
  value: {
    type: Number,
    min: 0,
    default: undefined
  },
  initial: {
    type: Number,
    min: 0,
    default: undefined
  },
  currency: {
    type: String,
    trim: true
  },
  discount_percent: {
    type: Number,
    min: 0,
    max: 100,
    default: undefined
  }
}, {
  _id: false
});
const term = new mongoose.Schema({
  value: {
    type: String,
    default: undefined
  },
  name: {
    type: String,
    default: undefined
  },
  name_fa: {
    type: String,
    default: undefined
  }
}, {
  _id: false
});
const offer = new mongoose.Schema({
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    default: null
  },
  platform_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Platform',
    default: null
  },
  url: {
    type: String,
    default: undefined
  },
  title: {
    type: String,
    default: undefined
  },
  platform: {
    type: String,
    default: undefined
  },
  store_name: {
    type: String,
    default: undefined
  },
  price: {
    type: priceSchema,
    default: undefined
  }
}, {
  _id: false
});
const store = new mongoose.Schema({
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    default: null
  },
  url: {
    type: String,
    default: undefined
  },
  source: {
    type: String,
    default: undefined
  }
}, {
  _id: false
});
const schema = new mongoose.Schema({
  ...baseSchema.obj,
  storage_sizes: {
    type: [new mongoose.Schema({
      platform_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', default: null },
      platform: { type: String, trim: true, required: true, maxlength: 100 },
      kind: { type: String, enum: ['download', 'install', 'required'], required: true },
      bytes: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
      provider: { type: String, enum: ['steam', 'xbox', 'manual'], required: true },
      source_url: { type: String, required: true, validate: value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } } },
      checked_at: { type: Date, required: true },
    }, { _id: false })],
    default: [],
    validate: rows => rows.length <= 100,
  },
  detail_poster: {
    type: String,
    default: null,
    validate: value => !value || /^(https?:\/\/|\/uploads\/)/.test(value)
  },
  detail_banner: {
    type: String,
    default: null,
    validate: value => !value || /^(https?:\/\/|\/uploads\/)/.test(value)
  },
  detail_gif: {
    type: String,
    default: null,
    validate: value => !value || /^(https?:\/\/|\/uploads\/)/.test(value)
  },
  capability_status: {
    type: new mongoose.Schema(Object.fromEntries(require('../utils/gameCapabilities').definitions.filter(item => item.group !== 'platform').map(item => [item.key, {
      type: Boolean,
      set: value => value === null ? false : value,
      default: undefined
    }])), {
      _id: false
    }),
    default: undefined
  },
  platform_capabilities: {
    type: [new mongoose.Schema({
      platform_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Platform',
        required: true
      },
      status: {
        type: new mongoose.Schema(Object.fromEntries(require('../utils/gameCapabilities').definitions.filter(item => item.group === 'platform').map(item => [item.key, {
          type: Boolean,
          set: value => value === null ? false : value,
          default: undefined
        }])), {
          _id: false
        }),
        required: true
      }
    }, {
      _id: false
    })],
    default: undefined
  },
  has_persian_subtitles: {
    type: Boolean,
    default: false
  },
  feature_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Feature',
    modelFile: 'feature',
    providerFilter: 'feature',
    resource: 'features'
  }],
  price_range_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PriceRange',
    modelFile: 'priceRange',
    providerFilter: 'price',
    resource: 'price-ranges'
  }],
  input_mode_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InputMode',
    modelFile: 'inputMode',
    providerFilter: 'input_mode',
    resource: 'input-modes'
  }],
  content_rating_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContentRating',
    modelFile: 'contentRating',
    providerFilter: 'content_rating_normalized',
    resource: 'content-ratings'
  }],
  platform_covers: {
    type: [new mongoose.Schema({
      platform_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Platform',
        required: true
      },
      low_quality: {
        type: String,
        default: null,
        validate: value => !value || /^(https?:\/\/|\/uploads\/)/.test(value)
      },
      high_quality: {
        type: String,
        default: null,
        validate: value => !value || /^(https?:\/\/|\/uploads\/)/.test(value)
      }
    }, {
      _id: false
    })],
    default: undefined,
    validate: rows => !rows || new Set(rows.map(row => String(row.platform_id))).size === rows.length
  },
  platform_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Platform',
    modelFile: 'platform',
    providerFilter: 'platform',
    resource: 'platforms'
  }],
  release_window_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReleaseWindow',
    modelFile: 'releaseWindow',
    providerFilter: 'release_date',
    resource: 'release-windows'
  }],
  review_rating_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReviewRating',
    modelFile: 'reviewRating',
    providerFilter: 'review_rating',
    resource: 'review-ratings'
  }],
  id: {
    type: Number,
    alias: 'gameId',
    min: 1,
    default: undefined,
    validate: value => value == null || Number.isSafeInteger(value)
  },
  // Exact source response, including nulls and fields added by the API later.
  // Typed fields and ObjectId relationships below remain the queryable model.
  gamebrain_source: {
    type: mongoose.Schema.Types.Mixed,
    default: undefined
  },
  auto_draft: { type: Boolean, default: false },
  draft_completed: { type: Boolean, default: false },
  draft_completion_errors: { type: [String], default: [] },
  link: {
    type: String,
    trim: true,
    default: undefined
  },
  genre: {
    type: String,
    trim: true,
    default: undefined
  },
  x_url: {
    type: String,
    trim: true,
    default: undefined
  },
  adult_only: {
    type: Boolean,
    default: undefined
  },
  image_aspect_ratio: {
    type: Number,
    min: Number.MIN_VALUE,
    default: undefined
  },
  rating: {
    type: new mongoose.Schema({
      mean: {
        type: Number,
        min: 0,
        max: 1,
        default: undefined
      },
      count: {
        type: Number,
        min: 0,
        default: undefined,
        validate: value => value == null || Number.isSafeInteger(value)
      },
      mean_players: {
        type: Number,
        min: 0,
        max: 1,
        default: undefined
      },
      count_players: {
        type: Number,
        min: 0,
        default: undefined,
        validate: value => value == null || Number.isSafeInteger(value)
      },
      mean_critics: {
        type: Number,
        min: 0,
        max: 1,
        default: undefined
      },
      count_critics: {
        type: Number,
        min: 0,
        default: undefined,
        validate: value => value == null || Number.isSafeInteger(value)
      }
    }, {
      _id: false
    }),
    default: undefined
  },
  playtime: {
    type: new mongoose.Schema({
      min: {
        type: Number,
        min: 0,
        default: undefined
      },
      max: {
        type: Number,
        min: 0,
        default: undefined
      },
      mean: {
        type: Number,
        min: 0,
        default: undefined
      },
      median: {
        type: Number,
        min: 0,
        default: undefined
      },
      mentions: {
        type: Number,
        min: 0,
        default: undefined,
        validate: value => value == null || Number.isSafeInteger(value)
      },
      percentiles: {
        type: [{
          type: Number,
          min: 0,
          default: undefined
        }],
        default: undefined
      }
    }, {
      _id: false
    }),
    default: undefined
  },
  theme_ids: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Theme',
      modelFile: 'theme',
      providerFilter: 'theme',
      resource: 'themes'
    }],
    default: undefined
  },
  similar_ids: {
    type: [{
      type: Number,
      min: 1,
      default: undefined,
      validate: value => value == null || Number.isSafeInteger(value)
    }],
    default: undefined
  },
  name: {
    type: String,
    trim: true,
    default: undefined
  },
  name_fa: {
    type: String,
    default: undefined
  },
  image: {
    type: String,
    default: undefined
  },
  developer: {
    type: String,
    default: undefined
  },
  platforms: {
    type: [term],
    default: undefined
  },
  genres: {
    type: [term],
    default: undefined
  },
  themes: {
    type: [term],
    default: undefined
  },
  play_modes: {
    type: [term],
    default: undefined
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag',
    modelFile: 'tag',
    providerFilter: 'tag',
    resource: 'game-tags'
  }],
  screenshots: {
    type: [String],
    default: undefined
  },
  twitch_videos: {
    type: [mongoose.Schema.Types.Mixed],
    default: undefined
  },
  videos: {
    type: [String],
    default: undefined
  },
  offers: {
    type: [offer],
    default: undefined
  },
  official_stores: {
    type: [store],
    default: undefined
  },
  micro_trailer: {
    type: String,
    default: undefined
  },
  title: {
    type: String,
    required: function () {
      return !this.name;
    },
    trim: true
  },
  short_title: {
    type: String,
    trim: true,
    default: ''
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  alternate_titles: {
    type: [{
      type: String,
      trim: true,
      required: true,
      maxlength: 200
    }],
    default: [],
    validate: value => value.length <= 100
  },
  sort_title: {
    type: String,
    trim: true,
    default: function () {
      return this.title;
    }
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
  publication_status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  official_website: {
    type: String,
    trim: true,
    default: null
  },
  developer_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  }],
  publisher_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  }],
  cover_media_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media',
    default: null
  },
  game_mode_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameMode',
    modelFile: 'gameMode',
    providerFilter: 'play_mode',
    resource: 'game-modes'
  }],
  game_series_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameSeries'
  }],
  genre_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Genre',
    modelFile: 'genre',
    providerFilter: 'genre',
    resource: 'genres'
  }]
}, {
  timestamps: true,
  id: false
});
schema.pre('validate', function () {
  if (this.isModified('name') && this.name) this.title = this.name;else if (this.title) this.name = this.title;
});
schema.index({
  id: 1
}, {
  unique: true,
  partialFilterExpression: {
    id: {
      $type: 'number'
    }
  }
});
schema.index({
  game_mode_ids: 1
});
schema.index({
  theme_ids: 1
});
schema.index({
  game_series_ids: 1
});
schema.index({
  publication_status: 1,
  release_date: -1
});
module.exports = mongoose.model('Game', schema);

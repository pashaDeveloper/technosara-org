const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');
const schema = new mongoose.Schema({
  ...baseSchema.obj,
  kind: {
    type: String,
    enum: ['game', 'filters'],
    required: true
  },
  state: {
    type: String,
    enum: ['pending', 'importing', 'imported', 'failed'],
    default: 'pending'
  },
  source_id: {
    type: String,
    trim: true,
    default: undefined
  },
  // Immutable upstream snapshot: nested API fields are validated by their
  // destination models before they can enter the catalog.
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    select: false
  },
  options: {
    target_game_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      default: undefined
    },
    slug: {
      type: String,
      trim: true,
      default: undefined
    },
    status: {
      type: String,
      enum: ['released', 'upcoming', 'cancelled'],
      default: undefined
    }
  },
  expires_at: {
    type: Date,
    required: true
  },
  result: {
    type: mongoose.Schema.Types.Mixed,
    default: undefined
  }
}, {
  timestamps: true,
  collection: 'import_reviews'
});
schema.index({
  creator: 1,
  state: 1,
  createdAt: -1
});
module.exports = mongoose.model('ImportReview', schema);

const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  ...require('./baseSchema.model').obj,
  game_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  source: {
    type: String,
    trim: true,
    default: undefined
  },
  image: {
    type: String,
    trim: true,
    default: undefined
  },
  published: {
    type: Date,
    default: undefined
  }
}, {
  timestamps: true,
  collection: 'news'
});
schema.index({
  game_id: 1,
  url: 1
}, {
  unique: true
});
module.exports = mongoose.model('News', schema);

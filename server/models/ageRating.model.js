const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');
const schema = new mongoose.Schema({
  ...baseSchema.obj,
  game_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  system: {
    type: String,
    enum: ['PEGI', 'ESRB', 'USK', 'CERO', 'IARC'],
    required: true,
    trim: true,
    uppercase: true
  },
  rating: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  }
}, {
  collection: 'age_ratings',
  timestamps: true
});
schema.index({
  game_id: 1,
  system: 1
}, {
  unique: true
});
module.exports = mongoose.model('AgeRating', schema);

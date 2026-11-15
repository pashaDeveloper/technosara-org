const mongoose = require('mongoose');
const value = new mongoose.Schema({
  key: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    min: 0,
    default: undefined,
    validate: value => value == null || Number.isSafeInteger(value)
  }
}, {
  _id: false
});
const schema = new mongoose.Schema({
  ...require('./baseSchema.model').obj,
  key: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  filter_type: {
    type: String,
    default: undefined
  },
  filter_connection: {
    type: String,
    default: undefined
  },
  values: {
    type: [value],
    required: true
  }
}, {
  timestamps: true,
  collection: 'filter_options'
});
module.exports = mongoose.model('FilterOption', schema);

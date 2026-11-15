const mongoose = require('mongoose');
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
  sort: {
    type: String,
    enum: ['ASC', 'DESC'],
    required: true
  }
}, {
  timestamps: true,
  collection: 'sorting_options'
});
module.exports = mongoose.model('SortingOption', schema);

const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');

const schema = new mongoose.Schema({
  ...baseSchema.obj,
  province: {
    type: String,
    default: '',
    trim: true,
    maxlength: 100
  },
  city: {
    type: String,
    default: '',
    trim: true,
    maxlength: 100
  },
  address: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500
  },
  plateNumber: {
    type: String,
    default: '',
    trim: true,
    maxlength: 20
  },
  postalCode: {
    type: String,
    default: '',
    trim: true,
    match: /^(?:\d{10})?$/
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Address', schema);

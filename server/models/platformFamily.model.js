const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');

const schema = new mongoose.Schema({
  ...baseSchema.obj,
  name: { type: String, required: true, trim: true, maxlength: 100 },
  key: { type: String, required: true, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('PlatformFamily', schema);

const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');

const image = new mongoose.Schema({
  url: { type: String, required: true, trim: true, match: /^(?:https?:\/\/|\/uploads\/)[^\s]+$/i },
  public_id: String,
}, { _id: false });

const schema = new mongoose.Schema({
  ...baseSchema.obj,
  title: { type: String, required: true, trim: true, maxlength: 200 },
  summary: { type: String, trim: true, maxlength: 5000 },
  price: { type: Number, required: true, min: 0 },
  condition: { type: String, enum: ['new', 'used', 'refurbished'], default: 'new' },
  thumbnail: image,
  gallery: [image],
  features: [{ title: String, content: [String] }],
  variations: { colors: [String], sizes: [String] },
  campaign: { state: { type: String, enum: ['discount', 'on-sale', 'new-arrival', 'sold-out'] }, title: String },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'RetailBrand' },
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'RetailStore' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'RetailCategory' },
}, { timestamps: true, collection: 'retail_products' });

schema.index({ status: 1, condition: 1, createdAt: -1 });
module.exports = mongoose.model('RetailProduct', schema);

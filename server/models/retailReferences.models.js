const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');

function reference(name, collection) {
  return mongoose.model(name, new mongoose.Schema({
    ...baseSchema.obj,
    title: { type: String, required: true, trim: true },
    description: String,
    thumbnail: { url: String, public_id: String },
    logo: { url: String, public_id: String },
    keynotes: [String],
    tags: [String],
  }, { timestamps: true, collection }));
}

module.exports = {
  brands: reference('RetailBrand', 'retail_brands'),
  categories: reference('RetailCategory', 'retail_categories'),
  stores: reference('RetailStore', 'retail_stores'),
};

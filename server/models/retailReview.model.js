const mongoose = require('mongoose');

module.exports = mongoose.model('RetailReview', new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'RetailProduct', required: true, index: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, required: true },
}, { timestamps: true, collection: 'retail_reviews' }));

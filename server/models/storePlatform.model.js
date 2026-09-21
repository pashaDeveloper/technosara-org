const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');

const schema = new mongoose.Schema({
  ...baseSchema.obj,
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  platform_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Platform',
    required: true
  },
  is_supported: {
    type: Boolean,
    default: true
  },
  is_primary: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  },
}, {
  collection: 'store_platforms',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
});

schema.remove(['createdAt', 'updatedAt']);
schema.index({ store_id: 1, platform_id: 1 }, { unique: true });
schema.index({ platform_id: 1 });

module.exports = mongoose.model('StorePlatform', schema);

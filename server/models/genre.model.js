const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');

const schema = new mongoose.Schema({
  ...baseSchema.obj,
  name: {
    type: String,
    required: true,
    trim: true
  },
  name_en: {
    type: String,
    trim: true,
    default: null
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  image: {
    type: String,
    default: '',
    validate: {
      validator: value => !value || require('../utils/catalogImage').localImage(value) || require('validator').isURL(value, { protocols: ['https'], require_protocol: true }) || (Buffer.byteLength(value) <= 7 * 1024 * 1024 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)),
      message: 'عکس باید PNG، JPEG یا WebP با حجم حداکثر ۵ مگابایت باشد.'
    }
  },
  description: {
    type: String,
    default: ''
  },
  sort_order: {
    type: Number,
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true
  },
}, {
  timestamps: true
});

schema.plugin(require('../utils/catalogImage').catalogImage, { category: 'genres', field: 'image' });
module.exports = mongoose.model('Genre', schema);

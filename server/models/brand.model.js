const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');
const { countryCodes } = require('../utils/country.util');
const schema = new mongoose.Schema({
  ...baseSchema.obj,
  name: { type: String, required: true, trim: true, maxlength: 200 },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  description: { type: String, trim: true, default: '', maxlength: 10000 },
  country_code: { type: String, uppercase: true, enum: [...countryCodes, ''], default: '' },
  founded_year: { type: Number, default: null, min: 1000, validate: value => value == null || (Number.isInteger(value) && value <= new Date().getFullYear()) },
  founded_date: { type: String, default: null, validate: value => { if (!value) return true; const date = new Date(value + 'T00:00:00Z'); return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && date <= new Date(); } },
  founders: { type: [new mongoose.Schema({ person_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true }, name: { type: String, required: true, trim: true } }, { _id: false })], default: [] },
  activity_fields: { type: [{ type: String, trim: true, required: true, maxlength: 200 }], default: [], validate: value => value.length <= 100 },
  website: { type: String, trim: true, default: '', validate: value => { if (!value) return true; try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; } } },
  logo: { type: String, trim: true, default: '' },
}, { timestamps: true });
schema.plugin(require('../utils/catalogImage').catalogImage);
module.exports = mongoose.model('Brand', schema);

const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');
const { countryCodes } = require('../utils/country.util');

const text = (maxlength = 200) => ({ type: String, trim: true, maxlength, default: '' });
const list = () => ({ type: [{ type: String, trim: true, required: true, maxlength: 200 }], default: [], validate: value => value.length <= 100 });
const validDate = value => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= new Date().toLocaleDateString('en-CA');
};
const validUrl = value => {
  if (!value) return true;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
};
const schema = new mongoose.Schema({
  ...baseSchema.obj,
  name: { ...text(), required: true },
  name_fa: text(),
  photo: { ...text(7 * 1024 * 1024), validate: value => !value || require('../utils/catalogImage').localImage(value) || validUrl(value) || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) },
  birth_date: { ...text(10), validate: validDate },
  death_date: { ...text(10), validate: validDate },
  birthplace: text(),
  country_code: { type: String, enum: [...countryCodes, ''], default: '' },
  activity_fields: list(),
  specialties: list(),
  positions: list(),
  awards: list(),
  biography: text(10000),
  website: { ...text(2000), validate: validUrl },
  social_links: { type: [{ type: String, trim: true, maxlength: 2000, validate: validUrl }], default: [], validate: value => value.length <= 100 },
}, { timestamps: true });

schema.pre('validate', function () {
  if (this.birth_date && this.death_date && this.death_date < this.birth_date) this.invalidate('death_date', 'تاریخ درگذشت باید پس از تاریخ تولد باشد');
});
schema.add({ slug: { type: String, trim: true, lowercase: true, default: undefined, index: { unique: true, sparse: true } } });
schema.plugin(require('../utils/catalogImage').catalogImage, { category: 'people', field: 'photo' });
module.exports = mongoose.model('Person', schema);

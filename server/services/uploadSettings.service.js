const mongoose = require('mongoose');
const defaults = Object.freeze({ quality: 88, maxDimension: 1600, previewQuality: 40, previewSize: 64, blur: 2, videoQuality: 65 });
const ranges = { quality: [10, 100], maxDimension: [320, 3840], previewQuality: [10, 80], previewSize: [16, 256], blur: [0, 20], videoQuality: [10, 90] };
const Model = mongoose.models.UploadSettings || mongoose.model('UploadSettings', new mongoose.Schema({
  _id: { type: String, default: 'global' },
  values: { type: Object, required: true },
}, { timestamps: true }));

function validate(values) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw Object.assign(new Error('Invalid upload settings'), { status: 400 });
  const result = { ...defaults };
  for (const [key, value] of Object.entries(values)) {
    const range = Object.hasOwn(ranges, key) ? ranges[key] : null;
    if (!range || !Number.isInteger(value) || value < range[0] || value > range[1]) throw Object.assign(new Error(`Invalid upload setting: ${key}`), { status: 400 });
    result[key] = value;
  }
  return result;
}
async function read() {
  const doc = await Model.findById('global').lean();
  return validate({ ...defaults, ...doc?.values });
}
async function save(values) {
  const settings = validate(values);
  await Model.findByIdAndUpdate('global', { values: settings }, { upsert: true, runValidators: true });
  return settings;
}
module.exports = { defaults, ranges, validate, read, save };

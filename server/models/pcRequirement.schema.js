const { Schema } = require('mongoose');

const text = () => ({ type: String, trim: true, maxlength: 12000 });
const bytes = () => ({ type: Number, min: 1, validate: Number.isSafeInteger });
const tier = new Schema({
  os: text(),
  processor: text(),
  processor_search: text(),
  memory_text: text(),
  memory_bytes: bytes(),
  graphics: text(),
  graphics_search: text(),
  directx: text(),
  storage_text: text(),
  storage_bytes: bytes(),
  network: text(),
  sound_card: text(),
  notes: text(),
  additional_notes: text(),
  other: { type: [new Schema({ label: text(), value: text() }, { _id: false })], default: undefined },
}, { _id: false });

module.exports = new Schema({
  minimum: tier,
  recommended: tier,
  source_url: { type: String, required: true, match: /^https:\/\/store\.steampowered\.com\/app\/[1-9]\d{0,9}\/$/ },
}, { _id: false });

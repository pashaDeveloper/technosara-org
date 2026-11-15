const mongoose = require("mongoose");
const baseSchema = require("./baseSchema.model");
const exampleSchema = new mongoose.Schema({
  ...baseSchema.obj,
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: "",
    trim: true
  }
}, {
  timestamps: true
});
module.exports = mongoose.model("Example", exampleSchema);

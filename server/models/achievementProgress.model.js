const mongoose = require('mongoose');
// Account-specific snapshots are deliberately separate from public catalogue data.
const schema = new mongoose.Schema({
  achievement_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement', required: true },
  provider: { type: String, required: true, enum: ['openxbl'] },
  account_id: { type: String, required: true },
  progress_state: { type: String, default: null },
  unlocked_at: { type: Date, default: null },
  requirements: { type: [{
    _id: false,
    external_id: String,
    current: String,
    target: String,
    operation_type: String,
    value_type: String,
    participation_type: String
  }], default: [] }
}, { timestamps: true });
schema.index({ achievement_id: 1, provider: 1, account_id: 1 }, { unique: true });
module.exports = mongoose.model('AchievementProgress', schema);

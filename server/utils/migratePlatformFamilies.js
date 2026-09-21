const Platform = require('../models/platform.model');
const Family = require('../models/platformFamily.model');

module.exports = async function migratePlatformFamilies() {
  let migrated = 0;
  const cursor = Platform.collection.find({ family: { $type: 'string', $ne: '' }, family_id: null });
  for await (const platform of cursor) {
    const name = platform.family.trim();
    if (!name) continue;
    const key = name.normalize('NFKC').toLowerCase();
    const family = await Family.findOneAndUpdate({ key }, {
      $setOnInsert: { key, name, creator: platform.creator || null }
    }, { upsert: true, new: true, setDefaultsOnInsert: true });
    const result = await Platform.collection.updateOne({ _id: platform._id, family_id: null }, { $set: { family_id: family._id } });
    migrated += result.modifiedCount;
  }
  return migrated;
};

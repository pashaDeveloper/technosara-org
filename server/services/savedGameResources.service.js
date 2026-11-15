async function read(gameId) {
  const contents = await require('../models/gameContent.model').find({ game_id: gameId }).lean();
  const [products, groups, achievements, platforms] = await Promise.all([
    require('../models/storeProduct.model').find({ content_id: { $in: contents.map(row => row._id) } }).lean(),
    require('../models/achievementGroup.model').find({ game_id: gameId }).lean(),
    require('../models/achievement.model').find({ game_id: gameId }).lean(),
    require('../models/platform.model').find().select('code value short_name').lean(),
  ]);
  const dlc = products.map(row => {
    const content = contents.find(content => String(content._id) === String(row.content_id));
    return { provider: row.provider, app_id: row.external_product_id, title: content.title, image: content.image, url: row.store_url, content, price: row.price, state: 'done' };
  });
  const trophies = groups.map(group => {
    const platform = platforms.find(row => String(row._id) === String(group.platform_id));
    const rows = achievements.filter(row => String(row.achievement_group_id) === String(group._id));
    const counts = {}; for (const row of rows) counts[row.achievement_type] = (counts[row.achievement_type] || 0) + 1;
    return { key: String(group._id), provider: group.provider, ppid: group.external_set_id?.split(':')[0], product_id: group.external_product_id, platform: platform?.code || platform?.value || 'unknown', game: { title: group.name }, counts, total: rows.length, trophies: rows, stored: true };
  });
  return { dlc, trophies };
}
module.exports = { read };

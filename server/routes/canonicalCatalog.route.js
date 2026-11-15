const router = require('express').Router();
const handler = require('./catalogResource.route');
const resources = { themes: 'themes', tags: 'game-tags', 'play-modes': 'game-modes', 'input-modes': 'input-modes', 'content-ratings': 'content-ratings', 'review-ratings': 'review-ratings', 'release-windows': 'release-windows', 'price-ranges': 'price-ranges', features: 'features', news: 'news', 'filter-options': 'filter-options', 'sorting-options': 'sorting-options' };
for (const [route, resource] of Object.entries(resources)) router.use(`/${route}`, handler(resource));
module.exports = router;

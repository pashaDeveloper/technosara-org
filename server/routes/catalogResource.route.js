const catalogRouter = require('./catalog.route');
module.exports = resource => (req, res, next) => {
  const original = req.url;
  req.url = `/${resource}${req.url === '/' ? '' : req.url}`;
  catalogRouter(req, res, error => { req.url = original; next(error); });
};

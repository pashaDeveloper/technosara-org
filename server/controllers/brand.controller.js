const service = require('../services/brand.service');
for (const name of ['list', 'options', 'countries', 'get', 'create', 'update', 'remove']) {
  exports[name] = async (req, res, next) => {
    try { await service[name](req, res); }
    catch (error) {
      if (req.rollbackUploads) await req.rollbackUploads().catch(err => console.error('[upload] rollback failed', err));
      if (error.code === 11000) return res.status(409).json({ message: 'این اسلاگ قبلاً استفاده شده است' });
      if (error.name === 'ValidationError') return res.status(400).json({ message: 'اطلاعات برند معتبر نیست' });
      if (error.status) return res.status(error.status).json({ acknowledgement: false, message: error.message });
      next(error);
    }
  };
}

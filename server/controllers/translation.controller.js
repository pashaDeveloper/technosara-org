const { translatePersian } = require('../services/translation.service');

exports.translatePersian = async (req, res) => {
  try {
    res.json(await translatePersian(req.body?.text, fetch, {sourceLanguage:req.body?.sourceLanguage || 'fa',targetLanguage:req.body?.targetLanguage || 'en',longText:req.body?.sourceLanguage === 'en' && req.body?.targetLanguage === 'fa'}));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

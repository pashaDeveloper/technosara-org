const { translatePersian } = require('../services/translation.service');

exports.translatePersian = async (req, res) => {
  try {
    res.json(await translatePersian(req.body?.text));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

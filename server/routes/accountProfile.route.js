const router = require('express').Router();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const verifyUser = require('../middleware/verifyUser.middleware');

router.get('/me', verifyUser, async (req, res, next) => {
  try {
    const id = req.user?._id;
    const account = typeof id === 'string' && mongoose.isObjectIdOrHexString(id)
      ? await User.findOne({ _id: id, status: 'active', isDeleted: { $ne: true } })
        .select('name email avatar.url phone role status').lean()
      : null;
    if (!account) {
      return res.status(401).json({
        acknowledgement: false,
        message: 'Unauthorized',
        description: 'لطفاً دوباره وارد حساب کاربری خود شوید.',
      });
    }
    res.json({ acknowledgement: true, message: 'OK', description: 'با موفقیت وارد شدید.', data: account });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

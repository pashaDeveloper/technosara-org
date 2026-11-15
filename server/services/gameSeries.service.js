const GameSeries = require("../models/gameSeries.model");

/* add new gameSeries */
exports.addGameSeries = async (req, res) => {
  try {
    const { body } = req;
    const lastGameSeries = await GameSeries.findOne().sort({ sort_order: -1 }).select('sort_order');
    const gameSeries = new GameSeries({
      ...req.uploadedImageValues,
    status: body.status,
      name: body.name,
      name_en: body.name ?? body.name_en,
    short_name: body.short_name,
      image: body.image,
      slug: body.slug,
      description: body.description,
      sort_order: (lastGameSeries?.sort_order ?? -1) + 1,
      is_active: body.is_active,
      creator: req.admin._id
    });

    await gameSeries.save();
    req.commitUploads?.();

    res.status(201).json({
      acknowledgement: true,
      message: "Created",
      description: "سری بازی با موفقیت ایجاد شد"
    });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    console.error("Error in addGameSeries:", error);
    res.status(error.name === 'ValidationError' ? 400 : error.code === 11000 ? 409 : 500).json({
      acknowledgement: false,
      message: "Internal Server Error",
      description: error.code === 11000 ? 'این اسلاگ قبلاً استفاده شده است.' : error.name === 'ValidationError' ? Object.values(error.errors).map(item => item.message).join('؛ ') : 'خطا در ایجاد سری بازی',
      error: error.message
    });
  }
};

/* get all gameSeriesEntries */
exports.getGameSeriesEntries = async (req, res) => {
  try {
    const { page = 1, limit = 5, search = "" } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 5;
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (search) {
      query.$or = [{ short_name: { $regex: search, $options: 'i' } }, { name: { $regex: search, $options: 'i' } }, { name_en: { $regex: search, $options: 'i' } }];
    }
    if (req.query.status) {
      query.is_active = req.query.status === "active";
    }

    const gameSeriesEntries = await GameSeries.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ sort_order: 1, _id: 1 })
      .populate({ path: "creator", select: "name avatar" });
    const total = await GameSeries.countDocuments(query);

    res.status(200).json({
      acknowledgement: true,
      message: "Ok",
      description: "فهرست سری بازی با موفقیت دریافت شد",
      data: gameSeriesEntries,
      total
    });
  } catch (error) {
    console.error("Error in getGameSeriesEntries:", error);
    return res.status(500).json({
      acknowledgement: false,
      message: "خطا در دریافت سری بازی",
      description: error.message || error.toString()
    });
  }
};

/* get a gameSeries */
exports.getGameSeries = async (req, res) => {
  const gameSeries = await GameSeries.findById(req.params.id);
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "سری بازی با موفقیت دریافت شد",
    data: gameSeries
  });
};

/* update gameSeries */
exports.updateGameSeries = async (req, res) => {
  const { body } = req;
  const updatedGameSeries = {
    ...req.uploadedImageValues,
    status: body.status,
    name: body.name,
    name_en: body.name ?? body.name_en,
    short_name: body.short_name,
    ...(body.image !== undefined ? { image: body.image } : {}),
    slug: body.slug,
    description: body.description,
    is_active: body.is_active
  };

  const saved = await GameSeries.findByIdAndUpdate(req.params.id, updatedGameSeries, { runValidators: true });
  if (!saved) return res.status(404).json({ acknowledgement: false, message: "Record not found" });
  await require('../utils/imageUpload').finishImageReplacement(req, res, saved.image_storage);

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "سری بازی با موفقیت ویرایش شد"
  });
};

/* delete gameSeries */
exports.deleteGameSeries = async (req, res) => {
  const gameSeries = await GameSeries.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, deletedAt: Date.now() },
    { new: true }
  );

  if (!gameSeries) {
    return res.status(404).json({
      acknowledgement: false,
      message: "سری بازی پیدا نشد",
      description: "سری بازی که می‌خواهید حذف کنید، وجود ندارد"
    });
  }

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "سری بازی با موفقیت حذف شد"
  });
};

exports.getGameSeriesOptions = async (req, res) => {
  const gameSeriesEntries = await GameSeries.find().sort({ sort_order: 1, _id: 1 }).select("name name_en short_name slug");
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فهرست سری بازی با موفقیت دریافت شد",
    data: gameSeriesEntries
  });
};

exports.createGameSeries = exports.addGameSeries;

exports.reorderGameSeries = async (req, res) => {
  const { id, targetId } = req.body;
  if (![id, targetId].every(value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)) || id === targetId) {
    return res.status(400).json({ acknowledgement: false, message: 'جابجایی معتبر نیست' });
  }
  const gameSeriesEntries = await GameSeries.find({ isDeleted: { $ne: true } }).sort({ sort_order: 1, _id: 1 }).select('_id').lean();
  const from = gameSeriesEntries.findIndex(item => String(item._id) === id);
  const to = gameSeriesEntries.findIndex(item => String(item._id) === targetId);
  if (from < 0 || to < 0) {
    return res.status(404).json({ acknowledgement: false, message: 'سری بازی پیدا نشد' });
  }
  const [moved] = gameSeriesEntries.splice(from, 1);
  gameSeriesEntries.splice(to, 0, moved);
  await GameSeries.bulkWrite(gameSeriesEntries.map((item, index) => ({
    updateOne: { filter: { _id: item._id }, update: { $set: { sort_order: index } } }
  })));
  res.status(200).json({ acknowledgement: true, description: 'ترتیب سری‌های بازی ذخیره شد' });
};

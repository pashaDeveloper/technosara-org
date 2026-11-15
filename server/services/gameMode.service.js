const GameMode = require("../models/gameMode.model");

/* add new gameMode */
exports.addGameMode = async (req, res) => {
  try {
    const { body } = req;
    const lastGameMode = await GameMode.findOne().sort({ sort_order: -1 }).select('sort_order');
    const gameMode = new GameMode({
      ...req.uploadedImageValues,
    status: body.status,
      name: body.name,
      name_fa: body.name_fa,
      name_en: body.name_en,
      image: body.image,
      slug: body.slug,
      description: body.description,
      sort_order: (lastGameMode?.sort_order ?? -1) + 1,
      is_active: body.is_active,
      creator: req.admin._id
    });

    await gameMode.save();
    req.commitUploads?.();

    res.status(201).json({
      acknowledgement: true,
      message: "Created",
      description: "حالت بازی با موفقیت ایجاد شد"
    });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    console.error("Error in addGameMode:", error);
    res.status(error.name === 'ValidationError' ? 400 : error.code === 11000 ? 409 : 500).json({
      acknowledgement: false,
      message: "Internal Server Error",
      description: error.code === 11000 ? 'این اسلاگ قبلاً استفاده شده است.' : error.name === 'ValidationError' ? Object.values(error.errors).map(item => item.message).join('؛ ') : 'خطا در ایجاد حالت بازی',
      error: error.message
    });
  }
};

/* get all gameModes */
exports.getGameModes = async (req, res) => {
  try {
    const { page = 1, limit = 5, search = "" } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 5;
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (search) {
      query.$or = [{ name: { $regex: search, $options: 'i' } }, { name_en: { $regex: search, $options: 'i' } }];
    }
    if (req.query.status) {
      query.is_active = req.query.status === "active";
    }

    const gameModes = await GameMode.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ sort_order: 1, _id: 1 })
      .populate({ path: "creator", select: "name avatar" });
    const total = await GameMode.countDocuments(query);

    res.status(200).json({
      acknowledgement: true,
      message: "Ok",
      description: "فهرست حالت بازی با موفقیت دریافت شد",
      data: gameModes,
      total
    });
  } catch (error) {
    console.error("Error in getGameModes:", error);
    return res.status(500).json({
      acknowledgement: false,
      message: "خطا در دریافت حالت بازی",
      description: error.message || error.toString()
    });
  }
};

/* get a gameMode */
exports.getGameMode = async (req, res) => {
  const gameMode = await GameMode.findById(req.params.id);
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "حالت بازی با موفقیت دریافت شد",
    data: gameMode
  });
};

/* update gameMode */
exports.updateGameMode = async (req, res) => {
  const { body } = req;
  const updatedGameMode = {
    ...req.uploadedImageValues,
    status: body.status,
    name: body.name,
      name_fa: body.name_fa,
    name_en: body.name_en,
    ...(body.image !== undefined ? { image: body.image } : {}),
    slug: body.slug,
    description: body.description,
    is_active: body.is_active
  };

  const saved = await GameMode.findByIdAndUpdate(req.params.id, updatedGameMode, { runValidators: true });
  if (!saved) return res.status(404).json({ acknowledgement: false, message: "Record not found" });
  await require('../utils/imageUpload').finishImageReplacement(req, res, saved.image_storage);

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "حالت بازی با موفقیت ویرایش شد"
  });
};

/* delete gameMode */
exports.deleteGameMode = async (req, res) => {
  const gameMode = await GameMode.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, deletedAt: Date.now() },
    { new: true }
  );

  if (!gameMode) {
    return res.status(404).json({
      acknowledgement: false,
      message: "حالت بازی پیدا نشد",
      description: "حالت بازی که می‌خواهید حذف کنید، وجود ندارد"
    });
  }

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "حالت بازی با موفقیت حذف شد"
  });
};

exports.getGameModeOptions = async (req, res) => {
  const gameModes = await GameMode.find().sort({ sort_order: 1, _id: 1 }).select("name name_fa name_en slug");
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فهرست حالت بازی با موفقیت دریافت شد",
    data: gameModes
  });
};

exports.createGameMode = exports.addGameMode;

exports.reorderGameMode = async (req, res) => {
  const { id, targetId } = req.body;
  if (![id, targetId].every(value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)) || id === targetId) {
    return res.status(400).json({ acknowledgement: false, message: 'جابجایی معتبر نیست' });
  }
  const gameModes = await GameMode.find({ isDeleted: { $ne: true } }).sort({ sort_order: 1, _id: 1 }).select('_id').lean();
  const from = gameModes.findIndex(item => String(item._id) === id);
  const to = gameModes.findIndex(item => String(item._id) === targetId);
  if (from < 0 || to < 0) {
    return res.status(404).json({ acknowledgement: false, message: 'حالت بازی پیدا نشد' });
  }
  const [moved] = gameModes.splice(from, 1);
  gameModes.splice(to, 0, moved);
  await GameMode.bulkWrite(gameModes.map((item, index) => ({
    updateOne: { filter: { _id: item._id }, update: { $set: { sort_order: index } } }
  })));
  res.status(200).json({ acknowledgement: true, description: 'ترتیب حالت‌های بازی ذخیره شد' });
};

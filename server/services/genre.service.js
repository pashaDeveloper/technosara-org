const Genre = require("../models/genre.model");

/* add new genre */
exports.addGenre = async (req, res) => {
  try {
    const { body } = req;
    const lastGenre = await Genre.findOne().sort({ sort_order: -1 }).select('sort_order');
    const genre = new Genre({
      ...req.uploadedImageValues,
    status: body.status,
      name: body.name,
      name_fa: body.name_fa,
      name_en: body.name_en,
      image: body.image,
      slug: body.slug,
      description: body.description,
      sort_order: (lastGenre?.sort_order ?? -1) + 1,
      is_active: body.is_active,
      creator: req.admin._id
    });

    await genre.save();
    req.commitUploads?.();

    res.status(201).json({
      acknowledgement: true,
      message: "Created",
      description: "ژانر با موفقیت ایجاد شد"
    });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    console.error("Error in addGenre:", error);
    res.status(error.name === 'ValidationError' ? 400 : error.code === 11000 ? 409 : 500).json({
      acknowledgement: false,
      message: "Internal Server Error",
      description: error.code === 11000 ? 'این اسلاگ قبلاً استفاده شده است.' : error.name === 'ValidationError' ? Object.values(error.errors).map(item => item.message).join('؛ ') : 'خطا در ایجاد ژانر',
      error: error.message
    });
  }
};

/* get all genres */
exports.getGenres = async (req, res) => {
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

    const genres = await Genre.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ sort_order: 1, _id: 1 })
      .populate({ path: "creator", select: "name avatar" });
    const total = await Genre.countDocuments(query);

    res.status(200).json({
      acknowledgement: true,
      message: "Ok",
      description: "فهرست ژانر با موفقیت دریافت شد",
      data: genres,
      total
    });
  } catch (error) {
    console.error("Error in getGenres:", error);
    return res.status(500).json({
      acknowledgement: false,
      message: "خطا در دریافت ژانر",
      description: error.message || error.toString()
    });
  }
};

/* get a genre */
exports.getGenre = async (req, res) => {
  const genre = await Genre.findById(req.params.id);
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "ژانر با موفقیت دریافت شد",
    data: genre
  });
};

/* update genre */
exports.updateGenre = async (req, res) => {
  const { body } = req;
  const updatedGenre = {
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

  const saved = await Genre.findByIdAndUpdate(req.params.id, updatedGenre, { runValidators: true });
  if (!saved) return res.status(404).json({ acknowledgement: false, message: "Record not found" });
  await require('../utils/imageUpload').finishImageReplacement(req, res, saved.image_storage);

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "ژانر با موفقیت ویرایش شد"
  });
};

/* delete genre */
exports.deleteGenre = async (req, res) => {
  const genre = await Genre.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, deletedAt: Date.now() },
    { new: true }
  );

  if (!genre) {
    return res.status(404).json({
      acknowledgement: false,
      message: "ژانر پیدا نشد",
      description: "ژانر که می‌خواهید حذف کنید، وجود ندارد"
    });
  }

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "ژانر با موفقیت حذف شد"
  });
};

exports.getGenreOptions = async (req, res) => {
  const genres = await Genre.find().sort({ sort_order: 1, _id: 1 }).select("name name_fa name_en slug");
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فهرست ژانر با موفقیت دریافت شد",
    data: genres
  });
};

exports.createGenre = exports.addGenre;

exports.reorderGenre = async (req, res) => {
  const { id, targetId } = req.body;
  if (![id, targetId].every(value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)) || id === targetId) {
    return res.status(400).json({ acknowledgement: false, message: 'جابجایی معتبر نیست' });
  }
  const genres = await Genre.find({ isDeleted: { $ne: true } }).sort({ sort_order: 1, _id: 1 }).select('_id').lean();
  const from = genres.findIndex(item => String(item._id) === id);
  const to = genres.findIndex(item => String(item._id) === targetId);
  if (from < 0 || to < 0) {
    return res.status(404).json({ acknowledgement: false, message: 'ژانر پیدا نشد' });
  }
  const [moved] = genres.splice(from, 1);
  genres.splice(to, 0, moved);
  await Genre.bulkWrite(genres.map((item, index) => ({
    updateOne: { filter: { _id: item._id }, update: { $set: { sort_order: index } } }
  })));
  res.status(200).json({ acknowledgement: true, description: 'ترتیب ژانرها ذخیره شد' });
};

const AgeRating = require("../models/ageRating.model");

/* add new ageRating */
exports.addAgeRating = async (req, res) => {
  try {
    const { body } = req;
    const ageRating = new AgeRating({
      status: body.status,
      game_id: body.game_id,
      system: body.system,
      rating: body.rating,
      description: body.description,
      creator: req.admin._id
    });

    await ageRating.save();

    res.status(201).json({
      acknowledgement: true,
      message: "Created",
      description: "رده‌بندی سنی با موفقیت ایجاد شد"
    });
  } catch (error) {
    console.error("Error in addAgeRating:", error);
    res.status(500).json({
      acknowledgement: false,
      message: "Internal Server Error",
      description: "خطا در ایجاد رده‌بندی سنی",
      error: error.message
    });
  }
};

/* get all ageRatings */
exports.getAgeRatings = async (req, res) => {
  try {
    const { page = 1, limit = 5, search = "" } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 5;
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (search) {
      query.rating = { $regex: search, $options: "i" };
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    const ageRatings = await AgeRating.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .populate({ path: "game_id", select: "title slug" })
      .populate({ path: "creator", select: "name avatar" });
    const total = await AgeRating.countDocuments(query);

    res.status(200).json({
      acknowledgement: true,
      message: "Ok",
      description: "فهرست رده‌بندی سنی با موفقیت دریافت شد",
      data: ageRatings,
      total
    });
  } catch (error) {
    console.error("Error in getAgeRatings:", error);
    return res.status(500).json({
      acknowledgement: false,
      message: "خطا در دریافت رده‌بندی سنی",
      description: error.message || error.toString()
    });
  }
};

/* get a ageRating */
exports.getAgeRating = async (req, res) => {
  const ageRating = await AgeRating.findById(req.params.id);
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "رده‌بندی سنی با موفقیت دریافت شد",
    data: ageRating
  });
};

/* update ageRating */
exports.updateAgeRating = async (req, res) => {
  const { body } = req;
  const updatedAgeRating = {
    status: body.status,
    game_id: body.game_id,
    system: body.system,
    rating: body.rating,
    description: body.description
  };

  await AgeRating.findByIdAndUpdate(req.params.id, updatedAgeRating, { runValidators: true });

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "رده‌بندی سنی با موفقیت ویرایش شد"
  });
};

/* delete ageRating */
exports.deleteAgeRating = async (req, res) => {
  const ageRating = await AgeRating.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, deletedAt: Date.now() },
    { new: true }
  );

  if (!ageRating) {
    return res.status(404).json({
      acknowledgement: false,
      message: "رده‌بندی سنی پیدا نشد",
      description: "رده‌بندی سنی که می‌خواهید حذف کنید، وجود ندارد"
    });
  }

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "رده‌بندی سنی با موفقیت حذف شد"
  });
};

exports.getAgeRatingOptions = async (req, res) => {
  const ageRatings = await AgeRating.find().select("rating");
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فهرست رده‌بندی سنی با موفقیت دریافت شد",
    data: ageRatings
  });
};

exports.createAgeRating = exports.addAgeRating;

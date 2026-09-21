const Edition = require("../models/edition.model");

/* add new edition */
exports.addEdition = async (req, res) => {
  try {
    const { body } = req;
    const edition = new Edition({
      status: body.status,
      game_id: body.game_id,
      name: body.name,
      slug: body.slug,
      description: body.description,
      release_date: body.release_date,
      is_base_edition: body.is_base_edition,
      creator: req.admin._id
    });

    await edition.save();

    res.status(201).json({
      acknowledgement: true,
      message: "Created",
      description: "نسخه بازی با موفقیت ایجاد شد"
    });
  } catch (error) {
    console.error("Error in addEdition:", error);
    res.status(500).json({
      acknowledgement: false,
      message: "Internal Server Error",
      description: "خطا در ایجاد نسخه بازی",
      error: error.message
    });
  }
};

/* get all editions */
exports.getEditions = async (req, res) => {
  try {
    const { page = 1, limit = 5, search = "" } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 5;
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    const editions = await Edition.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .populate({ path: "game_id", select: "title slug" })
      .populate({ path: "creator", select: "name avatar" });
    const total = await Edition.countDocuments(query);

    res.status(200).json({
      acknowledgement: true,
      message: "Ok",
      description: "فهرست نسخه بازی با موفقیت دریافت شد",
      data: editions,
      total
    });
  } catch (error) {
    console.error("Error in getEditions:", error);
    return res.status(500).json({
      acknowledgement: false,
      message: "خطا در دریافت نسخه بازی",
      description: error.message || error.toString()
    });
  }
};

/* get a edition */
exports.getEdition = async (req, res) => {
  const edition = await Edition.findById(req.params.id);
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "نسخه بازی با موفقیت دریافت شد",
    data: edition
  });
};

/* update edition */
exports.updateEdition = async (req, res) => {
  const { body } = req;
  const updatedEdition = {
    status: body.status,
    game_id: body.game_id,
    name: body.name,
    slug: body.slug,
    description: body.description,
    release_date: body.release_date,
    is_base_edition: body.is_base_edition
  };

  await Edition.findByIdAndUpdate(req.params.id, updatedEdition, { runValidators: true });

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "نسخه بازی با موفقیت ویرایش شد"
  });
};

/* delete edition */
exports.deleteEdition = async (req, res) => {
  const edition = await Edition.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, deletedAt: Date.now() },
    { new: true }
  );

  if (!edition) {
    return res.status(404).json({
      acknowledgement: false,
      message: "نسخه بازی پیدا نشد",
      description: "نسخه بازی که می‌خواهید حذف کنید، وجود ندارد"
    });
  }

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "نسخه بازی با موفقیت حذف شد"
  });
};

exports.getEditionOptions = async (req, res) => {
  const editions = await Edition.find().select("name slug");
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فهرست نسخه بازی با موفقیت دریافت شد",
    data: editions
  });
};

exports.createEdition = exports.addEdition;

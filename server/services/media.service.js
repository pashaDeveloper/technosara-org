const Media = require("../models/media.model");

/* add new media */
exports.addMedia = async (req, res) => {
  try {
    const { body } = req;
    const media = new Media({
      status: body.status,
      game_id: body.game_id,
      store_product_id: body.store_product_id,
      media_type: body.media_type,
      url: body.url,
      thumbnail_url: body.thumbnail_url,
      width: body.width,
      height: body.height,
      language: body.language,
      source: body.source,
      external_id: body.external_id,
      sort_order: body.sort_order,
      creator: req.admin._id
    });

    await media.save();

    res.status(201).json({
      acknowledgement: true,
      message: "Created",
      description: "رسانه با موفقیت ایجاد شد"
    });
  } catch (error) {
    console.error("Error in addMedia:", error);
    res.status(500).json({
      acknowledgement: false,
      message: "Internal Server Error",
      description: "خطا در ایجاد رسانه",
      error: error.message
    });
  }
};

/* get all mediaList */
exports.getMediaList = async (req, res) => {
  try {
    const { page = 1, limit = 5, search = "" } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 5;
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (search) {
      query.url = { $regex: search, $options: "i" };
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    const mediaList = await Media.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .populate({ path: "game_id", select: "title slug" })
      .populate({ path: "store_product_id", select: "store_title" })
      .populate({ path: "creator", select: "name avatar" });
    const total = await Media.countDocuments(query);

    res.status(200).json({
      acknowledgement: true,
      message: "Ok",
      description: "فهرست رسانه با موفقیت دریافت شد",
      data: mediaList,
      total
    });
  } catch (error) {
    console.error("Error in getMediaList:", error);
    return res.status(500).json({
      acknowledgement: false,
      message: "خطا در دریافت رسانه",
      description: error.message || error.toString()
    });
  }
};

/* get a media */
exports.getMedia = async (req, res) => {
  const media = await Media.findById(req.params.id);
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "رسانه با موفقیت دریافت شد",
    data: media
  });
};

/* update media */
exports.updateMedia = async (req, res) => {
  const { body } = req;
  const updatedMedia = {
    status: body.status,
    game_id: body.game_id,
    store_product_id: body.store_product_id,
    media_type: body.media_type,
    url: body.url,
    thumbnail_url: body.thumbnail_url,
    width: body.width,
    height: body.height,
    language: body.language,
    source: body.source,
    external_id: body.external_id,
    sort_order: body.sort_order
  };

  await Media.findByIdAndUpdate(req.params.id, updatedMedia, { runValidators: true });

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "رسانه با موفقیت ویرایش شد"
  });
};

/* delete media */
exports.deleteMedia = async (req, res) => {
  const media = await Media.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, deletedAt: Date.now() },
    { new: true }
  );

  if (!media) {
    return res.status(404).json({
      acknowledgement: false,
      message: "رسانه پیدا نشد",
      description: "رسانه که می‌خواهید حذف کنید، وجود ندارد"
    });
  }

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "رسانه با موفقیت حذف شد"
  });
};

exports.getMediaOptions = async (req, res) => {
  const mediaList = await Media.find().select("url");
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فهرست رسانه با موفقیت دریافت شد",
    data: mediaList
  });
};

exports.createMedia = exports.addMedia;

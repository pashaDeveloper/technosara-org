const { collectionGames } = require("../utils/collectionGames");
const Collection = require("../models/collection.model");

/* add new collection */
exports.addCollection = async (req, res) => {
  try {
    const { body } = req;
    const lastCollection = await Collection.findOne().sort({ sort_order: -1 }).select('sort_order');
    const collection = new Collection({
      ...req.uploadedImageValues,
    status: body.status,
      game_ids: await collectionGames(body.game_ids),
      name: body.name,
      name_en: body.name_en,
      image: body.image,
      slug: body.slug,
      description: body.description,
      sort_order: (lastCollection?.sort_order ?? -1) + 1,
      is_active: body.is_active,
      creator: req.admin._id
    });

    await collection.save();
    req.commitUploads?.();

    res.status(201).json({
      acknowledgement: true,
      message: "Created",
      description: "کالکشن با موفقیت ایجاد شد"
    });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    console.error("Error in addCollection:", error);
    res.status(error.name === 'ValidationError' ? 400 : error.code === 11000 ? 409 : 500).json({
      acknowledgement: false,
      message: "Internal Server Error",
      description: error.code === 11000 ? 'این اسلاگ قبلاً استفاده شده است.' : error.name === 'ValidationError' ? Object.values(error.errors).map(item => item.message).join('؛ ') : 'خطا در ایجاد کالکشن',
      error: error.message
    });
  }
};

/* get all collections */
exports.getCollections = async (req, res) => {
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

    const collections = await Collection.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ sort_order: 1, _id: 1 })
      .populate({ path: "creator", select: "name avatar" });
    const total = await Collection.countDocuments(query);

    res.status(200).json({
      acknowledgement: true,
      message: "Ok",
      description: "فهرست کالکشن با موفقیت دریافت شد",
      data: collections,
      total
    });
  } catch (error) {
    console.error("Error in getCollections:", error);
    return res.status(500).json({
      acknowledgement: false,
      message: "خطا در دریافت کالکشن",
      description: error.message || error.toString()
    });
  }
};

/* get a collection */
exports.getCollection = async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "کالکشن با موفقیت دریافت شد",
    data: collection
  });
};

/* update collection */
exports.updateCollection = async (req, res) => {
  const { body } = req;
  const updatedCollection = {
    ...req.uploadedImageValues,
    status: body.status,
    game_ids: await collectionGames(body.game_ids),
    name: body.name,
    name_en: body.name_en,
    ...(body.image !== undefined ? { image: body.image } : {}),
    slug: body.slug,
    description: body.description,
    is_active: body.is_active
  };

  const saved = await Collection.findByIdAndUpdate(req.params.id, updatedCollection, { runValidators: true });
  if (!saved) return res.status(404).json({ acknowledgement: false, message: "Record not found" });
  await require('../utils/imageUpload').finishImageReplacement(req, res, saved.image_storage);

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "کالکشن با موفقیت ویرایش شد"
  });
};

/* delete collection */
exports.deleteCollection = async (req, res) => {
  const collection = await Collection.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, deletedAt: Date.now() },
    { new: true }
  );

  if (!collection) {
    return res.status(404).json({
      acknowledgement: false,
      message: "کالکشن پیدا نشد",
      description: "کالکشن که می‌خواهید حذف کنید، وجود ندارد"
    });
  }

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "کالکشن با موفقیت حذف شد"
  });
};

exports.getCollectionOptions = async (req, res) => {
  const collections = await Collection.find().sort({ sort_order: 1, _id: 1 }).select("name slug");
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فهرست کالکشن با موفقیت دریافت شد",
    data: collections
  });
};

exports.createCollection = exports.addCollection;

exports.reorderCollection = async (req, res) => {
  const { id, targetId } = req.body;
  if (![id, targetId].every(value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)) || id === targetId) {
    return res.status(400).json({ acknowledgement: false, message: 'جابجایی معتبر نیست' });
  }
  const collections = await Collection.find({ isDeleted: { $ne: true } }).sort({ sort_order: 1, _id: 1 }).select('_id').lean();
  const from = collections.findIndex(item => String(item._id) === id);
  const to = collections.findIndex(item => String(item._id) === targetId);
  if (from < 0 || to < 0) {
    return res.status(404).json({ acknowledgement: false, message: 'کالکشن پیدا نشد' });
  }
  const [moved] = collections.splice(from, 1);
  collections.splice(to, 0, moved);
  await Collection.bulkWrite(collections.map((item, index) => ({
    updateOne: { filter: { _id: item._id }, update: { $set: { sort_order: index } } }
  })));
  res.status(200).json({ acknowledgement: true, description: 'ترتیب کالکشنها ذخیره شد' });
};

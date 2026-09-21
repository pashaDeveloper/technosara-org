const Platform = require("../models/platform.model");

const Brand = require('../models/brand.model');
const { validatePlatformRelations } = require('../utils/platformRelations');
const { platformCode } = require('../utils/platformNames');

async function validRelations(req, res) {
  const error = await validatePlatformRelations(req.body, req.params?.id, Platform, Brand);
  if (!error) return true;
  res.status(400).json({ acknowledgement: false, message: error });
  return false;
}

/* add new platform */
exports.addPlatform = async (req, res) => {
  if (!await validRelations(req, res)) return;
  try {
    const { body } = req;
    const platform = new Platform({
      ...req.uploadedImageValues,
    status: body.status,
      code: platformCode(body.name),
      name: body.name,
      brand_id: body.brand_id || null,
      slug: body.slug,
      device_type: 'console',
      generation: body.generation,
      parent_id: body.parent_id || null,
      release_date: body.release_date,
      discontinued_date: body.discontinued_date,
      icon: body.icon,
      logo: body.logo,
      website_url: body.website_url,
      sort_order: body.sort_order,
      is_active: body.is_active,
      creator: req.admin._id
    });

    await platform.save();
    req.commitUploads?.();

    res.status(201).json({
      acknowledgement: true,
      message: "Created",
      description: "پلتفرم با موفقیت ایجاد شد"
    });
  } catch (error) {
    if (error.status === 400 || error.name === 'ValidationError') return res.status(400).json({ message: error.status === 400 ? error.message : 'اطلاعات پلتفرم معتبر نیست.' });
    if (error.code === 11000) return res.status(409).json({ message: 'این اسلاگ قبلاً استفاده شده است.' });
    console.error("Error in addPlatform:", error);
    res.status(500).json({
      acknowledgement: false,
      message: "Internal Server Error",
      description: "خطا در ایجاد پلتفرم",
      error: error.message
    });
  }
};

/* get all platforms */
exports.getPlatforms = async (req, res) => {
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
      query.is_active = req.query.status === "active";
    }

    const platforms = await Platform.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ sort_order: 1, createdAt: -1, _id: 1 })
      .populate({ path: "parent_id", select: "name code" })
      .populate({ path: "brand_id", select: "name slug" })
      .populate({ path: "creator", select: "name avatar" });
    const total = await Platform.countDocuments(query);

    res.status(200).json({
      acknowledgement: true,
      message: "Ok",
      description: "فهرست پلتفرم با موفقیت دریافت شد",
      data: platforms,
      total
    });
  } catch (error) {
    console.error("Error in getPlatforms:", error);
    return res.status(500).json({
      acknowledgement: false,
      message: "خطا در دریافت پلتفرم",
      description: error.message || error.toString()
    });
  }
};

/* get a platform */
exports.getPlatform = async (req, res) => {
  const platform = await Platform.findById(req.params.id);
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "پلتفرم با موفقیت دریافت شد",
    data: platform
  });
};

/* update platform */
exports.updatePlatform = async (req, res) => {
  if (!await validRelations(req, res)) return;
  const { body } = req;
  const updatedPlatform = {
    ...req.uploadedImageValues,
    status: body.status,
    name: body.name,
    ...(body.brand_id !== undefined ? { brand_id: body.brand_id || null } : {}),
      slug: body.slug,
    generation: body.generation,
    ...(body.parent_id !== undefined ? { parent_id: body.parent_id || null } : {}),
    release_date: body.release_date,
    discontinued_date: body.discontinued_date,
    icon: body.icon,
    logo: body.logo,
    website_url: body.website_url,
    sort_order: body.sort_order,
    is_active: body.is_active
  };

  const saved = await Platform.findByIdAndUpdate(req.params.id, updatedPlatform, { runValidators: true });
  if (!saved) return res.status(404).json({ acknowledgement: false, message: "Record not found" });
  req.commitUploads?.();

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "پلتفرم با موفقیت ویرایش شد"
  });
};

/* delete platform */
exports.deletePlatform = async (req, res) => {
  if (await Platform.exists({ parent_id: req.params.id })) return res.status(409).json({ message: 'ابتدا والد پلتفرم‌های فرزند را تغییر دهید' });
  const platform = await Platform.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, deletedAt: Date.now() },
    { new: true }
  );

  if (!platform) {
    return res.status(404).json({
      acknowledgement: false,
      message: "پلتفرم پیدا نشد",
      description: "پلتفرم که می‌خواهید حذف کنید، وجود ندارد"
    });
  }

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "پلتفرم با موفقیت حذف شد"
  });
};

exports.getPlatformOptions = async (req, res) => {
  const platforms = await Platform.find().sort({ sort_order: 1, createdAt: -1, _id: 1 }).select("name code parent_id brand_id");
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فهرست پلتفرم با موفقیت دریافت شد",
    data: platforms
  });
};

exports.createPlatform = exports.addPlatform;

exports.reorderPlatforms = async (req, res) => {
  const { id, targetId, position } = req.body || {};
  const validId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
  if (!validId(id) || !validId(targetId) || id.toLowerCase() === targetId.toLowerCase() || !['before', 'after'].includes(position)) {
    return res.status(400).json({ acknowledgement: false, message: 'درخواست جابه‌جایی معتبر نیست' });
  }
  const records = await Platform.find().sort({ sort_order: 1, createdAt: -1, _id: 1 }).select('_id').lean();
  const ids = records.map(record => String(record._id));
  const from = ids.indexOf(id.toLowerCase());
  if (from < 0 || !ids.includes(targetId.toLowerCase())) {
    return res.status(404).json({ acknowledgement: false, message: 'پلتفرم پیدا نشد؛ فهرست را تازه‌سازی کنید' });
  }
  const [moved] = ids.splice(from, 1);
  const target = ids.indexOf(targetId.toLowerCase());
  ids.splice(target + (position === 'after' ? 1 : 0), 0, moved);
  await Platform.bulkWrite(ids.map((_id, sort_order) => ({
    updateOne: { filter: { _id, isDeleted: false }, update: { $set: { sort_order } } },
  })));
  res.status(200).json({ acknowledgement: true, description: 'ترتیب نمایش ذخیره شد' });
};

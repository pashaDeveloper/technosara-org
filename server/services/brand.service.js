const mongoose = require('mongoose');
const Brand = require("../models/brand.model");
const Platform = require("../models/platform.model");
const values = require("../utils/brandValues");
const { countries } = require("../utils/country.util");

/* add new brand */
exports.addBrand = async (req, res) => {
  try {
    const { body } = req;
    const brand = new Brand({
      ...await values(body),
      ...req.uploadedImageValues,
      creator: req.admin._id
    });

    await brand.save();
    req.commitUploads?.();

    res.status(201).json({
      acknowledgement: true,
      message: "Created",
      description: "برند با موفقیت ایجاد شد"
    });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    console.error("Error in addBrand:", error);
    res.status(error.name === 'ValidationError' ? 400 : error.code === 11000 ? 409 : 500).json({
      acknowledgement: false,
      message: "Internal Server Error",
      description: error.code === 11000 ? 'این اسلاگ قبلاً استفاده شده است.' : error.name === 'ValidationError' ? Object.values(error.errors).map(item => item.message).join('؛ ') : 'خطا در ایجاد برند',
      error: error.message
    });
  }
};

/* get all brands */
exports.getBrands = async (req, res) => {
  try {
    const { page = 1, limit = 5, search = "" } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 5));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (search) {
      query.$or = [{ name: { $regex: search, $options: 'i' } }, { activity_fields: { $regex: search, $options: 'i' } }];
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    const brands = await Brand.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1, _id: -1 })
      .populate({ path: "creator", select: "name avatar" });
    const total = await Brand.countDocuments(query);

    res.status(200).json({
      acknowledgement: true,
      message: "Ok",
      description: "فهرست برند با موفقیت دریافت شد",
      data: brands,
      total
    });
  } catch (error) {
    console.error("Error in getBrands:", error);
    return res.status(500).json({
      acknowledgement: false,
      message: "خطا در دریافت برند",
      description: error.message || error.toString()
    });
  }
};

/* get a brand */
exports.getBrand = async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ acknowledgement: false, message: "Invalid brand ID" });
  const brand = await Brand.findById(req.params.id);
  if (!brand) return res.status(404).json({ acknowledgement: false, message: "Record not found" });
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "برند با موفقیت دریافت شد",
    data: brand
  });
};

/* update brand */
exports.updateBrand = async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ acknowledgement: false, message: "Invalid brand ID" });
  const { body } = req;
  const updatedBrand = {
    ...await values(body),
    ...req.uploadedImageValues
  };

  let saved;
  try {
    saved = await Brand.findByIdAndUpdate(req.params.id, updatedBrand, { runValidators: true });
  } catch (error) {
    if (error.code === 11000) error.status = 409;
    if (error.name === 'ValidationError') error.status = 400;
    throw error;
  }
  if (!saved) return res.status(404).json({ acknowledgement: false, message: "Record not found" });
  await require('../utils/imageUpload').finishImageReplacement(req, res, saved.image_storage);

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "برند با موفقیت ویرایش شد"
  });
};

/* delete brand */
exports.deleteBrand = async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ acknowledgement: false, message: "Invalid brand ID" });
  if (await Platform.exists({ brand_id: req.params.id })) {
    return res.status(409).json({ acknowledgement: false, message: "این برند به پلتفرم متصل است؛ ابتدا برند پلتفرم‌ها را تغییر دهید" });
  }
  const brand = await Brand.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, deletedAt: Date.now() },
    { new: true }
  );

  if (!brand) {
    return res.status(404).json({
      acknowledgement: false,
      message: "برند پیدا نشد",
      description: "برند که می‌خواهید حذف کنید، وجود ندارد"
    });
  }

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "برند با موفقیت حذف شد"
  });
};

exports.getBrandOptions = async (req, res) => {
  const brands = await Brand.find().sort({ name: 1 }).select("name slug");
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فهرست برند با موفقیت دریافت شد",
    data: brands
  });
};

exports.createBrand = exports.addBrand;

exports.getBrandCountries = async (req, res) => {
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "کشورها با موفقیت دریافت شدند",
    data: countries
  });
};


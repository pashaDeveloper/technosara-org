const Company = require("../models/company.model");
const { resolvePeople, withPeople } = require('../utils/companyPeople');
const { randomUUID } = require('crypto');
const { countries } = require("../utils/country.util");

/* add new company */
exports.addCompany = async (req, res) => {
  try {
    const { body } = req;
    const people = await resolvePeople(body);
    const company = new Company({
      ...req.uploadedImageValues,
      status: body.status,
      name: body.name,
      name_fa: body.name_fa,
      slug: body.slug || `${String(body.name || 'company').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 60) || 'company'}-${randomUUID()}`,
      type: body.type,
      founded_year: body.founded_date ? Number(body.founded_date.slice(0, 4)) : body.founded_year,
      founded_date: body.founded_date,
      ...people,
      website: body.website,
      logo: body.logo,
      country_code: body.country_code,
      creator: req.admin._id
    });

    await company.save();
    req.commitUploads?.();

    res.status(201).json({
      acknowledgement: true,
      message: "Created",
      description: "شرکت با موفقیت ایجاد شد"
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'این اسلاگ قبلاً استفاده شده است.' });
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'اطلاعات شرکت معتبر نیست.' });
    if (error.status === 400) return res.status(400).json({ acknowledgement: false, message: error.message });
    console.error("Error in addCompany:", error);
    res.status(500).json({
      acknowledgement: false,
      message: "Internal Server Error",
      description: "خطا در ایجاد شرکت",
      error: error.message
    });
  }
};

/* get all companies */
exports.getCompanies = async (req, res) => {
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

    const companies = await Company.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .populate({ path: "creator", select: "name avatar" });
    const total = await Company.countDocuments(query);

    res.status(200).json({
      acknowledgement: true,
      message: "Ok",
      description: "فهرست شرکت با موفقیت دریافت شد",
      data: companies,
      total
    });
  } catch (error) {
    console.error("Error in getCompanies:", error);
    return res.status(500).json({
      acknowledgement: false,
      message: "خطا در دریافت شرکت",
      description: error.message || error.toString()
    });
  }
};

/* get a company */
exports.getCompany = async (req, res) => {
  const company = await Company.findById(req.params.id);
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "شرکت با موفقیت دریافت شد",
    data: await withPeople(company)
  });
};

/* update company */
exports.updateCompany = async (req, res) => {
  const { body } = req;
  const existing = await Company.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'شرکت پیدا نشد' });
  const people = await resolvePeople(body, existing);
  const updatedCompany = {
    ...req.uploadedImageValues,
    status: body.status,
    name: body.name,
      name_fa: body.name_fa,
    slug: body.slug,
    type: body.type,
    founded_year: body.founded_date === undefined ? body.founded_year : body.founded_date ? Number(body.founded_date.slice(0, 4)) : null,
    founded_date: body.founded_date,
    ...people,
    website: body.website,
    logo: body.logo,
    country_code: body.country_code
  };

  const saved = await Company.findByIdAndUpdate(req.params.id, updatedCompany, { runValidators: true });
  if (!saved) return res.status(404).json({ acknowledgement: false, message: "Record not found" });
  await require('../utils/imageUpload').finishImageReplacement(req, res, saved.image_storage);

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "شرکت با موفقیت ویرایش شد"
  });
};

/* delete company */
exports.deleteCompany = async (req, res) => {
  const company = await Company.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, deletedAt: Date.now() },
    { new: true }
  );

  if (!company) {
    return res.status(404).json({
      acknowledgement: false,
      message: "شرکت پیدا نشد",
      description: "شرکت که می‌خواهید حذف کنید، وجود ندارد"
    });
  }

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "شرکت با موفقیت حذف شد"
  });
};

exports.getCompanyOptions = async (req, res) => {
  const companies = await Company.find().select("name name_fa name_en slug");
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فهرست شرکت با موفقیت دریافت شد",
    data: companies
  });
};

exports.getCompanyCountries = async (req, res) => {
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "کشورها با موفقیت دریافت شدند",
    data: countries
  });
};

exports.createCompany = exports.addCompany;

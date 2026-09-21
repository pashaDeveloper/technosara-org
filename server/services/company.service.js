const Company = require("../models/company.model");
const Person = require('../models/person.model');
const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { countries } = require("../utils/country.util");

async function resolvePeople(body, existing = {}) {
  const result = {};
  for (const key of ['founders', 'key_members']) {
    if (body[key] === undefined) continue;
    const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };
    if (!Array.isArray(body[key]) || body[key].length > 100) fail('حداکثر ۱۰۰ شخص انتخاب کنید');
    const seen = new Set();
    result[key] = [];
    for (const item of body[key]) {
      if (!item || typeof item !== 'object') fail('شخص را از فهرست اشخاص انتخاب کنید');
      if (!item.person_id) {
        // Preserve existing free-text entries until the user links them to a profile.
        const legacy = (existing[key] || []).find(old => !old.person_id && old.name === item.name);
        if (!legacy) fail('شخص را از فهرست اشخاص انتخاب کنید');
        result[key].push({ name: legacy.name, ...(key === 'key_members' ? { role: item.role || '' } : {}) });
        continue;
      }
      if (!mongoose.isObjectIdOrHexString(item.person_id)) fail('شناسه شخص معتبر نیست');
      const id = String(item.person_id);
      if (seen.has(id)) fail('یک شخص را دوبار انتخاب نکنید');
      seen.add(id);
      const person = await Person.findById(id).select('name');
      const previous = (existing[key] || []).find(old => String(old.person_id) === id);
      if (!person && !previous) fail('شخص انتخاب‌شده پیدا نشد؛ فهرست را تازه‌سازی کنید');
      result[key].push({ person_id: id, name: person?.name || previous.name, ...(key === 'key_members' ? { role: item.role || '' } : {}) });
    }
  }
  return result;
}

async function withPeople(company) {
  if (!company) return company;
  const data = company.toObject();
  const ids = [...data.founders, ...data.key_members].map(item => item.person_id).filter(Boolean);
  const people = await Person.find({ _id: { $in: ids } }).select('name photo');
  const byId = new Map(people.map(person => [String(person._id), person]));
  for (const key of ['founders', 'key_members']) data[key] = data[key].map(item => {
    const person = byId.get(String(item.person_id));
    return person ? { ...item, name: person.name, photo: person.photo } : item;
  });
  return data;
}

/* add new company */
exports.addCompany = async (req, res) => {
  try {
    const { body } = req;
    const people = await resolvePeople(body);
    const company = new Company({
      ...req.uploadedImageValues,
    status: body.status,
      name: body.name,
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
  req.commitUploads?.();

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
  const companies = await Company.find().select("name slug");
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

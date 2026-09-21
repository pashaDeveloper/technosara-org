const mongoose = require('mongoose');
const Brand = require('../models/brand.model');

const Platform = require('../models/platform.model');
const Person = require('../models/person.model');
const fields = ['name', 'slug', 'description', 'logo', 'country_code', 'founded_year', 'founded_date', 'activity_fields', 'website'];
exports.countries = (req, res) => res.json({ acknowledgement: true, data: require('../utils/country.util').countries });
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
async function values(body) {
  const result = Object.fromEntries(fields.filter(key => Object.hasOwn(body, key)).map(key => [key, body[key]]));
  if (Object.hasOwn(body, 'founded_date')) {
    if (body.founded_date !== null && typeof body.founded_date !== 'string') fail('تاریخ تأسیس معتبر نیست');
    result.founded_date = body.founded_date || null;
    result.founded_year = result.founded_date ? Number(result.founded_date.slice(0, 4)) : null;
  }
  if (Object.hasOwn(body, 'founders')) {
    if (!Array.isArray(body.founders) || body.founders.length > 100) fail('مؤسسان را از فهرست اشخاص انتخاب کنید');
    result.founders = [];
    const seen = new Set();
    for (const item of body.founders) {
      if (!item || !mongoose.isObjectIdOrHexString(item.person_id)) fail('شخص انتخاب‌شده معتبر نیست');
      const id = String(item.person_id);
      if (seen.has(id)) fail('شخص تکراری انتخاب شده است');
      seen.add(id);
      const person = await Person.findById(id).select('name');
      if (!person) fail('شخص انتخاب‌شده پیدا نشد');
      result.founders.push({ person_id: person._id, name: person.name });
    }
  }

  return result;
}
async function record(id) {
  if (!mongoose.isObjectIdOrHexString(id)) fail('شناسه برند معتبر نیست');
  const brand = await Brand.findById(id);
  if (!brand) fail('برند پیدا نشد', 404);
  return brand;
}
exports.list = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 5));
  const search = String(req.query.search || '').slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const query = search ? { $or: ['name', 'activity_fields'].map(field => ({ [field]: { $regex: search, $options: 'i' } })) } : {};
  const [data, total] = await Promise.all([Brand.find(query).populate('creator', 'name avatar').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit), Brand.countDocuments(query)]);
  res.json({ acknowledgement: true, message: 'Ok', description: 'فهرست برند با موفقیت دریافت شد', data, total });
};
exports.options = async (req, res) => res.json({ acknowledgement: true, message: 'Ok', description: 'فهرست برند با موفقیت دریافت شد', data: await Brand.find().select('name slug').sort({ name: 1 }) });
exports.get = async (req, res) => res.json({ acknowledgement: true, message: 'Ok', description: 'برند با موفقیت دریافت شد', data: await record(req.params.id) });
exports.create = async (req, res) => {
  await Brand.create({ ...await values(req.body), ...req.uploadedImageValues, creator: req.admin._id });
  req.commitUploads?.();
  res.status(201).json({ acknowledgement: true, message: 'Created', description: 'برند ایجاد شد' });
};
exports.update = async (req, res) => {
  const brand = await record(req.params.id);
  brand.set({ ...await values(req.body), ...req.uploadedImageValues });
  await brand.save();
  req.commitUploads?.();
  res.json({ acknowledgement: true, message: 'Ok', description: 'برند ویرایش شد' });
};
exports.remove = async (req, res) => {
  const brand = await record(req.params.id);
  if (await Platform.exists({ brand_id: brand._id })) fail('این برند به پلتفرم متصل است؛ ابتدا برند پلتفرم‌ها را تغییر دهید', 409);
  await brand.softDelete();
  res.json({ acknowledgement: true, message: 'Ok', description: 'برند حذف شد' });
};

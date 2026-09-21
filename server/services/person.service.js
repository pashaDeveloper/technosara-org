const Person = require('../models/person.model');
const { countries } = require('../utils/country.util');
const editable = ['name', 'name_fa', 'slug', 'photo', 'birth_date', 'death_date', 'birthplace', 'country_code', 'activity_fields', 'specialties', 'positions', 'awards', 'biography', 'website', 'social_links', 'status'];
const values = body => Object.fromEntries(editable.filter(key => Object.hasOwn(body, key)).map(key => [key, body[key]]));
const find = async (req, res) => {
  const person = await Person.findById(req.params.id);
  if (!person) res.status(404).json({ message: 'شخص پیدا نشد' });
  return person;
};
exports.list = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const search = String(req.query.search || '').trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const query = search ? { $or: ['name', 'name_fa', 'activity_fields', 'specialties', 'positions'].map(key => ({ [key]: { $regex: search, $options: 'i' } })) } : {};
  if (req.query.status) query.status = req.query.status;
  const [data, total] = await Promise.all([
    Person.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit), Person.countDocuments(query)
  ]);
  res.json({ acknowledgement: true, data, total, page });
};
exports.countries = (req, res) => res.json({ acknowledgement: true, data: countries });
exports.options = async (req, res) => res.json({ acknowledgement: true, data: await Person.find().select('name photo positions').sort({ name: 1 }) });
exports.get = async (req, res) => {
  const person = await find(req, res);
  if (person) res.json({ acknowledgement: true, data: person });
};
exports.create = async (req, res) => {
  await Person.create({ ...values(req.body), ...req.uploadedImageValues, creator: req.admin._id });
  req.commitUploads?.();
  res.status(201).json({ acknowledgement: true, description: 'شخص با موفقیت اضافه شد' });
};
exports.update = async (req, res) => {
  const person = await find(req, res);
  if (!person) return;
  person.set({ ...values(req.body), ...req.uploadedImageValues });
  await person.save();
  req.commitUploads?.();
  res.json({ acknowledgement: true, description: 'اطلاعات شخص ویرایش شد' });
};
exports.remove = async (req, res) => {
  const person = await find(req, res);
  if (!person) return;
  await person.softDelete();
  res.json({ acknowledgement: true, description: 'شخص حذف شد' });
};

const mongoose = require('mongoose');
const Person = require('../models/person.model');
const fields = ['name', 'slug', 'description', 'logo', 'country_code', 'founded_year', 'founded_date', 'activity_fields', 'website', 'status'];
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

module.exports = values;

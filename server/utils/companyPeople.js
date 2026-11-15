const Person = require('../models/person.model');
const mongoose = require('mongoose');

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

module.exports = { resolvePeople, withPeople };

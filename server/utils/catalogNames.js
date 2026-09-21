function englishName(record) {
  const name = (record.english_name || record.name || '').trim();
  if (!name || /[\u0600-\u06ff]/.test(name)) throw new Error(`Missing English name: ${record.slug || record._id}`);
  return name;
}

function personNames(record) {
  return {
    name: englishName(record),
    name_fa: record.name_fa || (record.english_name && record.name !== record.english_name ? record.name : ''),
  };
}

function companyNames(record) { return { name: englishName(record) }; }

function genreNames(record) {
  if (Object.hasOwn(record, 'name_en')) return { name: record.name, name_en: record.name_en };
  return { name: record.name_fa || record.name, name_en: record.name };
}

module.exports = { personNames, companyNames, genreNames };

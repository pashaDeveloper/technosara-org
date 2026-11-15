const invalid = message => Object.assign(new Error(message), { status: 400 });
function alternateTitleValues(body) {
  if (body.alternate_titles === undefined) return {};
  let values = body.alternate_titles;
  if (typeof values === 'string') {
    try { values = JSON.parse(values); } catch { throw invalid('عنوان‌های جایگزین باید یک فهرست باشند'); }
  }
  if (!Array.isArray(values) || values.length > 100 || values.some(value => typeof value !== 'string' || !value.trim() || value.trim().length > 200)) throw invalid('حداکثر ۱۰۰ عنوان جایگزین، هرکدام تا ۲۰۰ کاراکتر وارد کنید');
  const seen = new Set();
  return { alternate_titles: values.map(value => value.trim()).filter(value => {
    const key = value.normalize('NFKC').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }) };
}
function gameTitleSearch(search) {
  if (search === undefined || search === '') return {};
  if (typeof search !== 'string' || search.length > 200) throw invalid('عبارت جست‌وجو معتبر نیست');
  const pattern = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!pattern) return {};
  return { $or: ['title', 'alternate_titles'].map(field => ({ [field]: { $regex: pattern, $options: 'i' } })) };
}
module.exports = { alternateTitleValues, gameTitleSearch };

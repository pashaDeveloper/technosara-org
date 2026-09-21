export const fields = [
  { key: 'name_fa', label: 'نام و نام خانوادگی فارسی', step: 1 },
  { key: 'name', label: 'نام انگلیسی', dir: 'ltr', required: true, step: 1 },
  { key: 'slug', label: 'اسلاگ', dir: 'ltr', step: 1 },
  { key: 'birth_date', label: 'تاریخ تولد (میلادی)', type: 'date', step: 2 },
  { key: 'death_date', label: 'تاریخ درگذشت (در صورت فوت)', type: 'date', step: 2 },
  { key: 'birthplace', label: 'محل تولد', step: 2 },
  { key: 'country_code', label: 'ملیت', type: 'country', step: 2 },
  { key: 'activity_fields', label: 'حوزه‌های فعالیت', type: 'list', step: 3 },
  { key: 'specialties', label: 'تخصص‌ها', type: 'list', step: 3 },
  { key: 'positions', label: 'سمت‌ها', type: 'list', step: 4 },
  { key: 'awards', label: 'افتخارات و جوایز', type: 'list', step: 4 },
  { key: 'biography', label: 'زندگی‌نامه', type: 'textarea', step: 5 },
  { key: 'website', label: 'وب‌سایت', type: 'url', dir: 'ltr', step: 5 },
];
export const formValues = (record = {}) => ({ photo: record.photo || '', ...Object.fromEntries(fields.map(field => [field.key, record[field.key] ?? (field.type === 'list' ? [] : '')])) });
export const validUrl = value => {
  if (!value) return true;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
};

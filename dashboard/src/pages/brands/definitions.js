export const definition = {
  title: 'برندها', singular: 'برند', identifier: 'slug',
  fields: [
    { key: 'logo', label: 'لوگو' },
    { key: 'name', label: 'نام انگلیسی برند', required: true, dir: 'ltr' },
    { key: 'slug', label: 'اسلاگ', required: true, dir: 'ltr' },
    { key: 'description', label: 'توضیحات', type: 'textarea' },
    { key: 'country_code', label: 'کشور' },
    { key: 'founded_date', label: 'تاریخ تأسیس' },
    { key: 'founders', label: 'مؤسسان', default: [] },
    { key: 'activity_fields', label: 'حوزه‌های فعالیت', default: [] },
    { key: 'website', label: 'وب‌سایت' },
  ],
};
export const formValues = (record = {}) => Object.fromEntries(definition.fields.map(field => [field.key, record[field.key] ?? field.default ?? '']));
export const brandBody = values => ({
  name: values.name.trim(), slug: values.slug.trim(),
  description: values.description.trim(), logo: values.logo?.trim() || '',
  country_code: values.country_code || '', founded_date: values.founded_date || null,
  founders: values.founders.map(person => ({ person_id: person.person_id })),
  activity_fields: values.activity_fields.map(value => value.trim()).filter(Boolean), website: values.website.trim(),
});

const field = (key, label, type = 'text', extra = {}) => ({ key, label, type, ...extra });
const options = entries => entries.map(([value, label]) => ({ value, label }));

export const definition = {
    title: 'شرکت‌ها', singular: 'شرکت', identifier: 'slug',
    fields: [
      field('slug', 'اسلاگ'),
      field('name', 'نام انگلیسی شرکت', 'text', { required: true, dir: 'ltr' }),
      field('founded_year', 'سال تأسیس شرکت (میلادی)', 'number'),
      field('founded_date', 'تاریخ تأسیس شرکت (میلادی)', 'date'),
      field('founders', 'مؤسسان', 'people', { default: [] }),
      field('key_members', 'اعضای مهم', 'people', { default: [] }),
      field('type', 'نوع فعالیت', 'select', { required: true, options: options([['developer', 'توسعه‌دهنده'], ['publisher', 'ناشر'], ['developer_publisher', 'توسعه‌دهنده و ناشر']]) }),
      field('country_code', 'کشور', 'country'), field('website', 'وب‌سایت', 'url'), field('logo', 'لوگو'),
    ],
  };

export const formValues = (definition, record = {}) => Object.fromEntries(definition.fields.map(field => {
  let value = record[field.key] ?? field.default ?? '';
  if (field.type === 'date' && value) value = value.slice(0, 10);
  return [field.key, value];
}));

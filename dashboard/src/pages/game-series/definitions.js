const field = (key, label, type = 'text', extra = {}) => ({ key, label, type, ...extra });
const options = entries => entries.map(([value, label]) => ({ value, label }));

export const definition = {
    title: 'سری‌های بازی', singular: 'سری بازی', identifier: 'slug',
    fields: [
      field('image', 'عکس'),
      field('name', 'عنوان انگلیسی', 'text', { required: true, dir: 'ltr' }),
      field('short_name', 'نام کوتاه', 'text', { dir: 'ltr' }),
      field('slug', 'اسلاگ', 'text', { required: true, dir: 'ltr' }), field('description', 'توضیحات', 'textarea'),
    ],
  };

export const formValues = (definition, record = {}) => Object.fromEntries(definition.fields.map(field => {
  let value = record[field.key] ?? field.default ?? '';
  if (field.type === 'date' && value) value = value.slice(0, 10);
  return [field.key, value];
}));

const field = (key, label, type = 'text', extra = {}) => ({ key, label, type, ...extra });
const options = entries => entries.map(([value, label]) => ({ value, label }));

export const definition = {
    title: 'کالکشنها', singular: 'کالکشن', identifier: 'slug',
    fields: [
      field('image', 'عکس'),
      field('name', 'نام', 'text', { required: true }),
      field('name_en', 'نام انگلیسی', 'text', { required: true, dir: 'ltr' }),
      field('slug', 'اسلاگ', 'text', { required: true, dir: 'ltr' }), field('description', 'توضیحات', 'textarea'),
    ],
  };

export const formValues = (definition, record = {}) => Object.fromEntries(definition.fields.map(field => {
  let value = record[field.key] ?? field.default ?? '';
  if (field.type === 'date' && value) value = value.slice(0, 10);
  return [field.key, value];
}));

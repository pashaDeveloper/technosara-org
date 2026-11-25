const field = (key, label, type = 'text', extra = {}) => ({ key, label, type, ...extra });

export const definition = {
    title: 'پلتفرم‌ها', singular: 'پلتفرم', identifier: 'slug',
    fields: [
      field('slug', 'اسلاگ'),
      field('name', 'نام انگلیسی پلتفرم', 'text', { required: true }),
      field('short_name', 'نام اختصاری'),
      field('brand_id', 'برند', 'brand'),
      field('generation', 'نسل', 'number', { options: [
        { value: 7, label: '۷' },
        { value: 8, label: '۸' },
        { value: 9, label: '۹' },
      ] }), field('parent_id', 'پلتفرم والد', 'parent'),
      field('release_date', 'تاریخ عرضه (میلادی)', 'date'), field('discontinued_date', 'تاریخ توقف تولید (میلادی)', 'date'),
      field('website_url', 'وب‌سایت', 'url'), field('logo', 'نشانی لوگو', 'url'), field('thumbnail', 'تصویر پلتفرم', 'url'),
      field('isSHow', 'نمایش در فیلتر بازی‌ها', 'checkbox', { default: false }),
    ],
  };

export const formValues = (definition, record = {}) => Object.fromEntries(definition.fields.map(field => {
  let value = record[field.key] ?? field.default ?? '';
  if (field.type === 'date' && value) value = value.slice(0, 10);
  return [field.key, value];
}));

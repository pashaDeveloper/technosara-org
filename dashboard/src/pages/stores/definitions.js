const field = (key, label, type = 'text', extra = {}) => ({ key, label, type, ...extra });
export const storeSteps = [
  { title: 'نام و تصویر', description: 'نام و تصویر فروشگاه را مشخص کنید.', fields: ['image', 'name', 'name_en', 'code', 'short_name'] },
  { title: 'مشخصات و کشور', description: 'اطلاعات ارائه‌دهنده و وب‌سایت فروشگاه را وارد کنید.', fields: ['provider', 'country_code', 'store_type', 'website_url', 'description'] },
  { title: 'قابلیت‌ها', description: 'وضعیت و امکانات فروشگاه را انتخاب کنید.', fields: ['is_active', 'supports_prices', 'supports_dlc', 'supports_achievements', 'supports_subscriptions', 'supports_reviews'] },
  { title: 'اتصال فروشگاه', description: 'این تنظیمات اختیاری‌اند؛ در صورت نیاز آن‌ها را تکمیل کنید.', fields: ['default_currency', 'default_region', 'product_url_template', 'api_available', 'api_base_url', 'api_version', 'auth_type'] },
];

export const definition = {
    title: 'فروشگاه‌ها', singular: 'فروشگاه', identifier: 'code',
    fields: [
      field('image', 'عکس'),
      field('name', 'نام', 'text', { required: true }),
      field('name_en', 'نام انگلیسی', 'text', { required: true, dir: 'ltr' }),
      field('code', 'کد', 'text', { required: true, dir: 'ltr' }), field('description', 'توضیحات', 'textarea'),
      field('short_name', 'نام کوتاه'),
      field('provider', 'ارائه‌دهنده'),
      field('country_code', 'کشور فروشگاه', 'country'),
      field('store_type', 'نوع فروشگاه', 'select', { options: [
        { value: 'digital', label: 'دیجیتال' }, { value: 'console', label: 'کنسولی' },
        { value: 'publisher', label: 'فروشگاه ناشر' }, { value: 'indie', label: 'بازی‌های مستقل' },
      ] }),
      field('website_url', 'وب‌سایت', 'url', { dir: 'ltr' }),
      field('product_url_template', 'الگوی نشانی محصول', 'text', { dir: 'ltr' }),
      field('default_currency', 'ارز پیش‌فرض', 'text', { dir: 'ltr' }),
      field('default_region', 'منطقهٔ پیش‌فرض', 'text', { dir: 'ltr' }),
      field('is_active', 'فعال', 'checkbox', { default: true }),
      field('supports_prices', 'نمایش قیمت', 'checkbox', { default: false }),
      field('supports_dlc', 'محتوای قابل دانلود (DLC)', 'checkbox', { default: false }),
      field('supports_achievements', 'دستاوردها', 'checkbox', { default: false }),
      field('supports_subscriptions', 'اشتراک', 'checkbox', { default: false }),
      field('supports_reviews', 'نقد کاربران', 'checkbox', { default: false }),
      field('api_available', 'API در دسترس', 'checkbox', { default: false }),
      field('api_base_url', 'نشانی پایهٔ API', 'url', { dir: 'ltr' }),
      field('api_version', 'نسخهٔ API', 'text', { dir: 'ltr' }),
      field('auth_type', 'روش احراز هویت API', 'text', { dir: 'ltr' }),
    ],
  };

export const formValues = (definition, record = {}) => Object.fromEntries(definition.fields.map(field => {
  let value = record[field.key] ?? field.default ?? '';
  if (field.type === 'date' && value) value = value.slice(0, 10);
  return [field.key, value];
}));

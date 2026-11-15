const field = (key, label, type = 'text', extra = {}) => ({ key, label, type, ...extra });
const providerLabels = { id: 'شناسهٔ GameBrain', image_aspect_ratio: 'نسبت عرض به ارتفاع تصویر', image: 'تصویر اصلی', link: 'صفحهٔ بازی در GameBrain', x_url: 'صفحهٔ شبکهٔ اجتماعی X', micro_trailer: 'تریلر کوتاه', developer: 'نام سازنده در منبع', genre: 'عنوان ژانر در منبع', name_fa: 'نام فارسی بازی', rating: 'امتیازها و ارزیابی‌ها', playtime: 'زمان بازی', platforms: 'پلتفرم‌های منبع', genres: 'ژانرهای منبع', themes: 'تم‌های منبع', play_modes: 'حالت‌های بازی در منبع', screenshots: 'تصاویر بازی', videos: 'ویدئوها', twitch_videos: 'ویدئوهای توییچ', offers: 'پیشنهادهای خرید', official_stores: 'فروشگاه‌های رسمی' };
export const statuses = [{ value: 'released', label: 'منتشر شده' }, { value: 'upcoming', label: 'در انتظار انتشار' }, { value: 'cancelled', label: 'لغو شده' }];
export const providerFields = [
 ...['id','image_aspect_ratio'].map(key => field(key,key,'number')),
 ...['image','link','x_url','micro_trailer'].map(key => field(key,key,'url',{dir:'ltr'})),
 ...['developer','genre','name_fa'].map(key => field(key,key)),
 field('adult_only','مخصوص بزرگسالان','checkbox'),
 ...['rating','playtime','platforms','genres','themes','play_modes','screenshots','videos','twitch_videos','offers','official_stores'].map(key => field(key,key,'json')),
];
export const definition = { fields: [
  field('storage_sizes', 'حجم بازی', 'json'),
  field('detail_poster', 'کاور عمودی جزئیات بازی', 'url'),
  field('detail_banner', 'تصویر عریض جزئیات بازی', 'url'),
  field('detail_gif', 'گیف جزئیات بازی', 'url'),
  field('capability_status', 'قابلیت‌های بازی', 'json'),
  field('platform_capabilities', 'قابلیت‌های پلتفرم', 'json'),
  field('feature_ids', 'قابلیت‌ها', 'multiple'),
  field('has_persian_subtitles', 'زیرنویس فارسی', 'switch', { default: false }),
  field('platform_covers', '\u06a9\u0627\u0648\u0631 \u067e\u0644\u062a\u0641\u0631\u0645', 'json'),
  ...providerFields, field('theme_ids','تم‌ها','multiple'),
  field('platform_ids','پلتفرم‌ها','multiple'), field('tags','تگ‌ها','multiple'),
  field('title', 'عنوان بازی', 'text', { required: true, dir: 'ltr' }),
  field('slug', 'اسلاگ', 'text', { required: true, dir: 'ltr' }),
  field('alternate_titles', 'عنوان‌های جایگزین برای جست‌وجو', 'list'),
  field('status', 'وضعیت انتشار', 'select', { required: true, default: 'released', options: statuses }),
  field('release_date', 'تاریخ انتشار', 'date', { dir: 'ltr' }),
  field('official_website', 'وب‌سایت رسمی', 'url', { dir: 'ltr' }),
  field('developer_ids', 'توسعه‌دهنده', 'multiple'), field('publisher_ids', 'ناشر', 'multiple'),
  field('genre_ids', 'ژانرها', 'multiple'), field('game_mode_ids', 'حالت‌های بازی', 'multiple'), field('game_series_ids', 'سری‌های بازی', 'multiple'),
  field('cover_media_id', 'رسانه کاور', 'relation'),
  field('short_description', 'توضیح کوتاه', 'textarea'), field('description', 'توضیحات کامل', 'textarea'),
] };
export const gameSteps = [
  { title: 'مشخصات بازی', description: 'عنوان، تصویر کاور و توضیحات معرفی بازی را بررسی و تکمیل کنید.', fields: ['title', 'slug', 'alternate_titles', 'image', 'short_description', 'description'] },
  { title: 'تصاویر و ویدئوها', description: 'تصاویر و ویدئوها را بررسی کنید و موارد اضافی را حذف کنید.', fields: ['screenshots','videos','twitch_videos'] },
  { title: 'انتشار و شرکت‌ها', description: 'اطلاعات انتشار، سازنده و ناشر بازی.', fields: ['status', 'release_date', 'official_website', 'developer_ids', 'publisher_ids'] },
  { title: 'دسته‌بندی', description: 'می‌توانید چند ژانر، حالت و سری انتخاب کنید.', fields: ['platform_ids', 'tags', 'theme_ids', 'genre_ids', 'game_mode_ids', 'game_series_ids'] },
];
for (const item of providerFields) if (providerLabels[item.key]) item.label = providerLabels[item.key];
gameSteps.push(
  { title: 'امتیاز و زمان بازی', description: 'امتیازها از ۱۰ نمایش داده می‌شوند. خانهٔ خالی یعنی اطلاعات موجود نیست.', fields: ['rating','playtime'] },
  { title: 'خرید بازی', description: 'فروشگاه‌ها، لینک محصول و قیمت‌ها را بررسی کنید.', fields: ['offers','official_stores'] },
);
const id = value => typeof value === 'object' ? value?._id || '' : value || '';
export function formValues(_definition, record = {}) {
  return Object.fromEntries(definition.fields.map(field => {
    let value = record[field.key] ?? field.default ?? (['multiple', 'list'].includes(field.type) ? [] : '');
    if (field.type === 'json') value = JSON.stringify(record[field.key] ?? (['rating','playtime','capability_status'].includes(field.key) ? {} : []), null, 2);
    if (['checkbox', 'switch'].includes(field.type)) value = Boolean(record[field.key]);
    if (field.type === 'multiple') value = value.map(id);
    if (field.type === 'relation') value = id(value);
    if (field.type === 'date' && value) value = value.slice(0, 10);
    return [field.key, value];
  }));
}

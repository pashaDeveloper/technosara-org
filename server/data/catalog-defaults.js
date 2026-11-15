module.exports = {
  features: {
    single_player: 'تک‌نفره', online_multiplayer: 'چندنفره آنلاین', local_multiplayer: 'چندنفره محلی',
    online_coop: 'همکاری آنلاین', local_coop: 'همکاری محلی', crossplay: 'بازی بین پلتفرم‌ها',
    cross_save: 'انتقال ذخیره', cross_progression: 'انتقال پیشرفت', cloud_saves: 'ذخیره ابری',
    achievements: 'اچیومنت', hdr: 'HDR', '4k': '4K', '120fps': '۱۲۰ فریم بر ثانیه', vr: 'واقعیت مجازی', ray_tracing: 'رهگیری پرتو',
  },
  sourceFields: ['title', 'sort_title', 'short_description', 'description', 'release_date', 'release_status', 'official_website'],
  providers: ['manual', 'publisher', 'xbox', 'playstation', 'steam', 'epic'],
};

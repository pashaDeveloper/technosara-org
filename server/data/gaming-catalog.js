// Curated seed. Sources and deliberate omissions are documented in reports/catalog-report.md.
const genres = [
  ['اکشن', 'Action', 'action', 'بازی‌هایی با تأکید بر واکنش سریع، زمان‌بندی و مهارت حرکتی بازیکن.'],
  ['ماجراجویی', 'Adventure', 'adventure', 'بازی‌هایی با تمرکز بر کاوش، روایت، تعامل با محیط و حل مسئله.'],
  ['اکشن ماجراجویی', 'Action Adventure', 'action-adventure', 'ترکیبی از مبارزه و چالش‌های حرکتی با کاوش و پیشروی داستانی.'],
  ['نقش‌آفرینی', 'Role Playing', 'role-playing', 'بازی‌هایی بر پایهٔ رشد شخصیت، انتخاب نقش و پیشرفت توانایی‌ها.'],
  ['نقش‌آفرینی اکشن', 'Action Role Playing', 'action-role-playing', 'نقش‌آفرینی با مبارزات بلادرنگ و کنترل مستقیم شخصیت.'],
  ['استراتژی', 'Strategy', 'strategy', 'بازی‌هایی با تمرکز بر برنامه‌ریزی، تصمیم‌گیری و مدیریت منابع.'],
  ['استراتژی هم‌زمان', 'Real Time Strategy', 'real-time-strategy', 'بازی‌های راهبردی که تصمیم‌ها و حرکت واحدها هم‌زمان انجام می‌شوند.'],
  ['استراتژی نوبتی', 'Turn Based Strategy', 'turn-based-strategy', 'بازی‌های راهبردی که بازیکنان به‌نوبت تصمیم می‌گیرند و اقدام می‌کنند.'],
  ['شبیه‌سازی', 'Simulation', 'simulation', 'بازی‌هایی که رفتار یک فعالیت، سامانه یا محیط را شبیه‌سازی می‌کنند.'],
  ['ورزشی', 'Sports', 'sports', 'بازی‌های مبتنی بر رشته‌ها و رقابت‌های ورزشی.'],
  ['مسابقه‌ای', 'Racing', 'racing', 'رقابت سرعت و مهارت رانندگی در مسیرهای مختلف.'],
  ['مبارزه‌ای', 'Fighting', 'fighting', 'بازی‌های مبتنی بر مبارزهٔ مستقیم شخصیت‌ها و اجرای حرکات و ترکیب‌ها.'],
  ['تیراندازی اول‌شخص', 'First Person Shooter', 'first-person-shooter', 'بازی‌های تیراندازی از دید شخصیت تحت کنترل بازیکن.'],
  ['تیراندازی سوم‌شخص', 'Third Person Shooter', 'third-person-shooter', 'بازی‌های تیراندازی با دوربینی بیرون از بدن شخصیت.'],
  ['سکوبازی', 'Platformer', 'platformer', 'بازی‌هایی با محوریت پرش، عبور از موانع و حرکت میان سکوها.'],
  ['معمایی', 'Puzzle', 'puzzle', 'بازی‌هایی با تمرکز بر حل معما، منطق و تشخیص الگو.'],
  ['وحشت بقا', 'Survival Horror', 'survival-horror', 'بازی‌های ترسناک با تأکید بر بقا، منابع محدود و آسیب‌پذیری شخصیت.'],
  ['بقا', 'Survival', 'survival', 'بازی‌هایی با تمرکز بر حفظ جان، گردآوری منابع و سازگاری با محیط.'],
  ['مخفی‌کاری', 'Stealth', 'stealth', 'پیشروی با پنهان‌ماندن، اجتناب از شناسایی و استفاده از محیط.'],
  ['ریتم', 'Rhythm', 'rhythm', 'بازی‌هایی که زمان‌بندی ورودی بازیکن با موسیقی یا ضرب‌آهنگ هماهنگ می‌شود.'],
].map(([name, name_en, slug, description], sort_order) => ({ name, name_en, slug, description, sort_order }));

const people = [
  { name: 'Bill Gates', name_fa: 'بیل گیتس', slug: 'bill-gates', birth_date: '1955-10-28', birthplace: 'سیاتل، واشینگتن، آمریکا', country_code: 'US', activity_fields: ['نرم‌افزار', 'کارآفرینی'], specialties: ['برنامه‌نویسی', 'مدیریت فناوری'], positions: ['هم‌بنیان‌گذار مایکروسافت', 'مدیرعامل پیشین مایکروسافت'], biography: 'بیل گیتس در سال ۱۹۷۵ همراه پل آلن مایکروسافت را تأسیس کرد. فعالیت او در گسترش نرم‌افزار رایانه‌های شخصی و مدیریت این شرکت، زمینهٔ توسعهٔ محصولات متعدد مایکروسافت را فراهم کرد.', website: 'https://www.gatesnotes.com/' },
  { name: 'Paul Allen', name_fa: 'پل آلن', slug: 'paul-allen', birth_date: '1953-01-21', death_date: '2018-10-15', birthplace: 'سیاتل، واشینگتن، آمریکا', country_code: 'US', activity_fields: ['نرم‌افزار', 'سرمایه‌گذاری'], specialties: ['برنامه‌نویسی', 'کارآفرینی'], positions: ['هم‌بنیان‌گذار مایکروسافت'], biography: 'پل آلن برنامه‌نویس و کارآفرین آمریکایی و هم‌بنیان‌گذار مایکروسافت در سال ۱۹۷۵ بود. همکاری اولیهٔ او با بیل گیتس بر توسعهٔ BASIC برای رایانهٔ Altair متمرکز بود.', website: 'https://www.paulallen.com/' },
  { name: 'Fusajiro Yamauchi', name_fa: 'فوساجیرو یامائوچی', slug: 'fusajiro-yamauchi', birth_date: '1859-11-22', death_date: '1940-01-01', birthplace: 'کیوتو، ژاپن', country_code: 'JP', activity_fields: ['کارت‌های بازی', 'کارآفرینی'], specialties: ['تولید کارت‌های هانافودا'], positions: ['بنیان‌گذار نینتندو'], biography: 'فوساجیرو یامائوچی در سال ۱۸۸۹ کسب‌وکار تولید کارت‌های هانافودا را در کیوتو پایه‌گذاری کرد که بعدها به نینتندو تبدیل شد. فعالیت او پیش از ورود شرکت به صنعت بازی‌های ویدئویی بود.' },
  { name: 'Shigeru Miyamoto', name_fa: 'شیگرو میاموتو', slug: 'shigeru-miyamoto', birth_date: '1952-11-16', birthplace: 'سونوبه، کیوتو، ژاپن', country_code: 'JP', activity_fields: ['بازی‌سازی'], specialties: ['طراحی بازی', 'کارگردانی', 'تهیه‌کنندگی'], positions: ['طراح و تهیه‌کنندهٔ بازی در نینتندو'], awards: ['فلوشیپ بفتا ۲۰۱۰'], biography: 'شیگرو میاموتو طراح بازی ژاپنی است که در سال ۱۹۷۷ به نینتندو پیوست. او از چهره‌های اصلی شکل‌گیری مجموعه‌های ماریو و افسانهٔ زلدا است و در سال ۲۰۱۰ فلوشیپ بفتا را دریافت کرد.' },
  { name: 'Ken Kutaragi', name_fa: 'کن کوتاراگی', slug: 'ken-kutaragi', country_code: 'JP', activity_fields: ['سخت‌افزار بازی', 'مدیریت فناوری'], specialties: ['مهندسی سخت‌افزار', 'توسعهٔ کنسول'], positions: ['رئیس پیشین سونی کامپیوتر انترتینمنت', 'از چهره‌های اصلی توسعهٔ پلی‌استیشن'], awards: ['جایزهٔ یک عمر دستاورد AIAS در سال ۲۰۰۸'], biography: 'کن کوتاراگی مهندس ژاپنی و از چهره‌های کلیدی ایجاد پلی‌استیشن است. او مدیریت سونی کامپیوتر انترتینمنت را بر عهده داشت و در سال ۲۰۰۸ جایزهٔ یک عمر دستاورد آکادمی هنرها و علوم تعاملی را دریافت کرد.' },
];
const companies = [
  { name: 'Microsoft', slug: 'microsoft', type: 'developer_publisher', country_code: 'US', founded_date: '1975-04-04', website: 'https://www.microsoft.com/', founderSlugs: ['bill-gates', 'paul-allen'] },
  { name: 'Nintendo', slug: 'nintendo', type: 'developer_publisher', country_code: 'JP', founded_date: '1889-09-23', website: 'https://www.nintendo.com/', founderSlugs: ['fusajiro-yamauchi'], memberSlugs: [['shigeru-miyamoto', 'طراح و تهیه‌کنندهٔ بازی']] },
  { name: 'Sony Computer Entertainment', slug: 'sony-computer-entertainment', type: 'developer_publisher', country_code: 'JP', founded_date: '1993-11-16', website: 'https://sonyinteractive.com/', memberSlugs: [['ken-kutaragi', 'رئیس پیشین؛ توسعه‌دهندهٔ اصلی پلی‌استیشن']] },
  { name: 'Sony Interactive Entertainment', slug: 'sony-interactive-entertainment', type: 'developer_publisher', country_code: 'US', founded_date: '2016-04-01', website: 'https://sonyinteractive.com/' },
];
const platforms = [
  ['ایکس‌باکس ۳۶۰', 'Xbox 360', 'xbox-360', 7, '2005-11-22', 'microsoft', 'https://www.xbox.com/'],
  ['پلی‌استیشن ۳', 'PlayStation 3', 'playstation-3', 7, '2006-11-11', 'sony-computer-entertainment', 'https://www.playstation.com/'],
  ['نینتندو وی', 'Wii', 'wii', 7, '2006-11-19', 'nintendo', 'https://www.nintendo.com/'],
  ['نینتندو وی یو', 'Wii U', 'wii-u', 8, '2012-11-18', 'nintendo', 'https://www.nintendo.com/'],
  ['پلی‌استیشن ۴', 'PlayStation 4', 'playstation-4', 8, '2013-11-15', 'sony-computer-entertainment', 'https://www.playstation.com/'],
  ['ایکس‌باکس وان', 'Xbox One', 'xbox-one', 8, '2013-11-22', 'microsoft', 'https://www.xbox.com/'],
  ['نینتندو سوییچ', 'Nintendo Switch', 'nintendo-switch', 8, '2017-03-03', 'nintendo', 'https://www.nintendo.com/us/gaming-systems/switch/'],
  ['ایکس‌باکس سری ایکس', 'Xbox Series X', 'xbox-series-x', 9, '2020-11-10', 'microsoft', 'https://www.xbox.com/en-US/consoles/xbox-series-x'],
  ['ایکس‌باکس سری اس', 'Xbox Series S', 'xbox-series-s', 9, '2020-11-10', 'microsoft', 'https://www.xbox.com/en-US/consoles/xbox-series-s'],
  ['پلی‌استیشن ۵', 'PlayStation 5', 'playstation-5', 9, '2020-11-12', 'sony-interactive-entertainment', 'https://www.playstation.com/en-us/ps5/'],
  ['نینتندو سوییچ ۲', 'Nintendo Switch 2', 'nintendo-switch-2', 9, '2025-06-05', 'nintendo', 'https://www.nintendo.com/us/gaming-systems/switch-2/'],
].map(([, name, slug, generation, release_date, manufacturer, website_url], sort_order) => ({ name, slug, code: slug, generation, release_date, brandSlug: manufacturer.startsWith('sony') ? 'playstation' : manufacturer === 'microsoft' ? 'xbox' : manufacturer, website_url, sort_order, device_type: 'console' }));
platforms.push(
  { name: 'PS4 Jailbreak', slug: 'ps4-jailbreak', code: 'ps4-jailbreak', parentSlug: 'playstation-4', brandSlug: 'playstation', device_type: 'console', generation: 8, sort_order: 11 },
  { name: 'PS4 Account', slug: 'ps4-account', code: 'ps4-account', parentSlug: 'playstation-4', brandSlug: 'playstation', device_type: 'console', generation: 8, sort_order: 12 },
);
const brandDetails = require('./brand-details.json');
const brands = brandDetails.brands;
const developers = require('./game-developers.json');
const withoutSources = ({ sources, ...record }) => record;
module.exports = {
  genres,
  brands,
  people: [...people, ...brandDetails.people, ...developers.people.map(withoutSources)],
  companies: [...companies, ...developers.companies.map(withoutSources)],
  platforms,
};

# ورود بازی با بررسی در داشبورد

از صفحهٔ بازی‌ها، «دریافت از GameBrain» مسیر `/games/import` را باز می‌کند. جست‌وجو، انتخاب بازی، مقصد جدید یا موجود، اسلاگ و وضعیت محلی در این صفحه انجام می‌شود. خبرها و مشابه‌ها اختیاری‌اند. قبل از ذخیره، فیلدها، رابطه‌ها و پاسخ کامل نمایش داده می‌شوند.

داشبورد با توکن مدیر به سرور درخواست می‌زند. کلید `GAMEBRAIN_API_KEY` فقط در `server/.env` است.

## مدل‌ها و رابطه‌ها

هر مدل فایل مستقل با `new mongoose.Schema`، فیلدهای `baseSchema` و `timestamps` دارد؛ model factory و ثبت یک مدل با چند اسم وجود ندارد. نام کلاس داخلی از ساختار پروژه پیروی می‌کند؛ فیلدهای منبع مانند `themes` و `play_modes` همان نام GameBrain را دارند.

| مدل | فایل | رابطه |
| --- | --- | --- |
| Game | `models/game.model.js` | بازی و فیلدهای جزئیات API |
| Theme | `models/theme.model.js` | `Game.theme_ids` |
| Genre | `models/genre.model.js` | `Game.genre_ids` |
| GameMode | `models/gameMode.model.js` | `Game.game_mode_ids` |
| GameTag | `models/gameTag.model.js` | عضویت از `game_ids` |
| Platform | `models/platform.model.js` | از طریق GamePlatform |
| Company | `models/company.model.js` | سازنده و ناشر محلی |
| StoreProduct | `models/storeProduct.model.js` | بازی، Store، قیمت و لینک فروش |
| Media | `models/media.model.js` | کاور، تصویر، ویدئو و تریلر با `game_id` |
| News | `models/news.model.js` | `game_id`, `title`, `url`, `source`, `image`, `published` |
| InputMode | `models/inputMode.model.js` | گزینه‌های ورودی |
| ContentRating | `models/contentRating.model.js` | ردهٔ عمومی، جدا از PEGI/ESRB |
| ReviewRating | `models/reviewRating.model.js` | گزینه‌های امتیاز |
| ReleaseWindow | `models/releaseWindow.model.js` | بازه‌های انتشار |
| PriceRange | `models/priceRange.model.js` | بازه‌های قیمت |
| Feature | `models/feature.model.js` | گزینه‌های Important |
| FilterOption | `models/filterOption.model.js` | `key`, `name`, `filter_type`, `filter_connection`, `values[{key,name,count}]` |
| SortingOption | `models/sortingOption.model.js` | `key`, `name`, `sort` |
| ImportReview | `models/importReview.model.js` | درخواست داخلی بررسی و تأیید مدیر |

`name` انگلیسی و `name_fa` فارسی است؛ `name_en` برای فرم‌های قبلی باقی مانده است. شناسه‌ها و داده‌های قبلی حفظ می‌شوند. `value` کلید دسته و `key` کلید فیلتر است. وجود گزینهٔ Touch یا Free در فیلترها آن ویژگی را به همهٔ بازی‌ها نسبت نمی‌دهد.

فیلدهای اصلی Game:

```text
id, name, image, image_aspect_ratio, gameplay, link, x_url,
rating, description, short_description, release_date, developer,
playtime, platforms, tags, genres, genre, themes, adult_only,
play_modes, screenshots, videos, offers, official_stores, micro_trailer
```

`id` عددی منبع و `_id` داخلی MongoDB است. آرایه‌های دسته‌بندی شکل `{value,name}` دارند و رابطه‌های داخلی با ObjectId ثبت می‌شوند. rating، playtime و offers.price دارای Schema مشخص‌اند. تروفی، اچیومنت، ناشر، سری و سایر داده‌های محلی حفظ می‌شوند. مقدار غایب یا رشتهٔ `"null"` به صفر تبدیل نمی‌شود.

## مسیرها

| مسیر | کاربرد |
| --- | --- |
| `GET /api/gamebrain/games?query=...` | جست‌وجو |
| `GET /api/gamebrain/games/suggestions?query=...` | پیشنهاد نام |
| `GET /api/gamebrain/games/:id` | جزئیات منبع |
| `GET /api/gamebrain/games/:id/similar` | مشابه‌ها |
| `GET /api/gamebrain/games/:id/news` | خبرها |
| `GET /api/gamebrain/filters` | فیلترها و مرتب‌سازی |
| `POST /api/gamebrain/games/:id/preview` | پیش‌نمایش بدون تغییر کاتالوگ |
| `POST /api/gamebrain/filters/preview` | پیش‌نمایش وابستگی‌ها |
| `POST /api/gamebrain/reviews/:id/confirm` | تأیید و ذخیرهٔ نسخهٔ بررسی‌شده |
| `GET /api/gamebrain/local/:localObjectId` | خروجی محلی با نام‌های API |

همهٔ مسیرها توکن مدیر نیاز دارند. برای پیش‌نمایش بازی جدید، `slug` و `status` محلی ارسال می‌شوند؛ برای بازی موجود `target_game_id`. گزینه‌های `include_news` و `include_similar` بولین‌اند. تأیید بدنهٔ `{"confirmed":true}` نیاز دارد.

ImportReview مدل داخلی گردش کار است، نه مدل API GameBrain. پیش‌نمایش ۳۰ دقیقه معتبر و متعلق به مدیر ایجادکننده است. دادهٔ جایگزین مرورگر هنگام تأیید پذیرفته نمی‌شود؛ همان snapshot نمایش‌داده‌شده ثبت می‌شود. تأیید هم‌زمان قفل و تأیید دوباره بدون ساخت رکورد تکراری پاسخ داده می‌شود. مدیر و تاریخ در approvalReview ثبت می‌شوند. بازی جدید پس از تأیید ورود همچنان draft است؛ انتشار عمومی جداست.

مسیرهای مستقیم قبلی `/games/:id/import` و `/filters/sync` پاسخ ۴۰۹ می‌دهند. ذخیره از داشبورد باید از پیش‌نمایش و تأیید عبور کند. اسکریپت‌های مدیریتی قبلی از داشبورد فراخوانی نمی‌شوند.

ورود هر بازی و روابطش تراکنشی است و replica set یا Atlas نیاز دارد. گروه‌های فیلتر در دسته‌های کوچک و قابل تکرار ثبت می‌شوند؛ شکست یک گروه، ثبت گروه‌های قبلی را برنمی‌گرداند.

## بررسی

۵۲۴ وابستگی و سه مرتب‌سازی از قبل ثبت شده‌اند. گزارش حفظ نام‌ها و شناسه‌ها: `reports/gamebrain-canonical-result.json`. این اجرا داده‌ای به کاتالوگ اصلی اضافه نکرده است.

۵۱ تست سرور و ساخت داشبورد موفق بودند. مسیر کامل پیش‌نمایش و تأیید بازی و فیلترها در دیتابیس آزمایشی جدا بررسی شد: قبل از تأیید کاتالوگ تغییر نکرد، بعد از تأیید روابط ثبت شدند و تأیید دوباره رکورد تکراری نساخت. دیتابیس آزمایشی پس از بررسی حذف شد.

مرجع فیلدها: https://gamebrain.co/api/docs/game-detail

# Server Base

داشبورد جدید React/Vite در پوشهٔ `dashboard` است. مسیرهای کوکی و حساب کاربری در
`routes/admin.route.js` اجرا می‌شوند. برای نسخهٔ نهایی، ابتدا در `dashboard`
دستور `npm run build` و سپس در این پوشه `npm start` را اجرا کنید؛ Express
داشبورد و API را روی یک پورت ارائه می‌کند.

تست‌های جدید: `node --test test/dashboard.test.js test/dashboard-integration.test.js`.
تست دوم به MongoDB محلی نیاز دارد و فقط پایگاه دادهٔ آزمایشی خودش را پاک می‌کند.

قالب عمومی سمت سرور برای شروع پروژه‌های Node.js است. ساختار پایهٔ `index.js` و `app.js` از سرور اصلی حفظ شده و پوشه فقط زیرساخت مشترک پروژه‌ها را دارد:

- Express و CORS
- اتصال اختیاری MongoDB با Mongoose
- مسیر سلامت `GET /api/health`
- پاسخ 404 و مدیریت خطای مرکزی
- session، cookie و احراز هویت JWT نمونه
- ساختار نمونهٔ Model / Service / Controller / Route در فایل‌های `example`
- تنظیمات Docker و متغیرهای محیطی نمونه

## اجرا

```bash
copy .env.example .env
npm install
npm run dev
```

تمام مسیرهای CRUD زیر با کوکی نشست مدیر محافظت می‌شوند. مسیرهای `users` فقط برای مدیر کل در دسترس هستند.

| مدل | مسیر API |
| --- | --- |
| Game | `/api/games` |
| Edition | `/api/editions` |
| AgeRating | `/api/age-ratings` |
| Media | `/api/media` |
| Platform | `/api/platforms` |
| Genre | `/api/genres` |
| Company | `/api/companies` |
| Store | `/api/stores` |
| AchievementGroup | `/api/achievement-groups` |
| Achievement | `/api/achievements` |
| User | `/api/users` |
| Address | `/api/addresses` |
| Example | `/api/examples` |

هر مسیر، عملیات `POST /`، `GET /`، `GET /:id`، `PATCH /:id` و `DELETE /:id`
و مسیر `GET /all` دارد. لیست‌ها `page=1`، `limit=5`، `search` و `status`
می‌پذیرند. صفحه‌بندی با `parseInt` و جست‌وجو مستقیماً با `$regex` در هر سرویس
انجام می‌شود. پاسخ لیست شامل `acknowledgement`، `message`، `description`،
`data` و `total` است؛ تعداد صفحات در پنل از `total` محاسبه می‌شود.

سازنده با `creator: req.admin._id` ثبت می‌شود و در لیست همراه با نام و آواتار
برمی‌گردد. فیلدهای قابل ذخیره مستقیماً در هر تابع مشخص شده‌اند. افزودن با
`new Model(...).save()` و ویرایش و حذف نرم با `findByIdAndUpdate` انجام می‌شود.
آرایه‌ها و metadata
به‌صورت JSON یا رشتهٔ JSON پذیرفته می‌شوند. `Address` مستقل دارای شناسه و
سازنده است؛ ساختار آدرس تعبیه‌شده در پروفایل مدیر حفظ شده است. `baseSchema`
اسکیما‌ی مشترک است و مسیر مستقل ندارد.

تست یکپارچهٔ تمام مدل‌ها با MongoDB محلی:

```bash
node --test test/model-crud.test.js test/catalog.test.js test/dashboard.test.js test/dashboard-integration.test.js
```

### Image uploads

Create/update routes for admin, company, genre, person and platform accept multipart images through upload(folder).fields(fields).

| Resource | File field | Folder |
| --- | --- | --- |
| Admin | avatar | admin |
| Company | logo | company |
| Genre | image | genre |
| Person | photo | person |
| Platform | logo | platform |

Set IMAGE_UPLOAD_PROVIDER to arvan (default), cloudinary, or both. A route can override this with upload("companies", "both").fields(companyUploadFields).
Arvan uses ARVAN_S3_ENDPOINT, ARVAN_S3_BUCKET, ARVAN_S3_ACCESS_KEY, ARVAN_S3_SECRET_KEY and ARVAN_PUBLIC_BASE_URL. Cloudinary uses CLOUD_NAME, API_KEY and API_SECRET.

Each field accepts one PNG, JPEG or WebP image up to 5 MB. The middleware saves WebP images and 64px previews. Existing JSON data-image inputs are also accepted. Multipart array/object fields must be JSON strings.

Services call req.commitUploads() only after a successful database write. Failed uploads or database operations roll back new files and previews on the selected providers; existing images are never included in rollback. Cleanup retries temporary deletion failures three times and logs persistent failures. Routes contain no model imports.

Run the focused checks with: node --test test/upload.test.js test/catalog-storage.test.js

Image object names use model/slug/12-character-random-id.webp, for example genre/action/aB3dE5fG7hJ9.webp. Previews use the same ID with -preview-64.webp. Folder labels prefer slug, english_name, then name; image-only updates without these use the record ID. Existing object URLs are unchanged.

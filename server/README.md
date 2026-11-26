# Server Base

Game catalog, product offers, prices and synchronization: see [CATALOG.md](CATALOG.md).

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

New catalog and game media uploads use Arvan Object Storage. A super admin can set the S3 endpoint, bucket, public file URL, region and keys in the API Tokens panel. The settings take effect on the current server after saving. Cloudinary credentials are only needed for cleanup of existing Cloudinary objects.

Each field accepts one PNG, JPEG or WebP image up to 5 MB. The middleware saves WebP images and 64px previews. Existing JSON data-image inputs are also accepted. Multipart array/object fields must be JSON strings.

Services call req.commitUploads() only after a successful database write. Failed uploads or database operations roll back new files and previews on the selected providers; existing images are never included in rollback. Cleanup retries temporary deletion failures three times and logs persistent failures. Routes contain no model imports.

Run the focused checks with: node --test test/upload.test.js test/catalog-storage.test.js

Image object names use model/slug/12-character-random-id.webp, for example genre/action/aB3dE5fG7hJ9.webp. Previews use the same ID with -preview-64.webp. Folder labels prefer slug, english_name, then name; image-only updates without these use the record ID. Existing object URLs are unchanged.

### Game relationship tags

Game tags are separate from SEO tags and curated collections. Manage them through `/api/game-tags` (list/create), `/api/game-tags/:id` (read/update/soft delete), `/api/game-tags/all` (options), and `/api/game-tags/reorder`. Mutations require an admin.

The `game_ids` array stores membership; a game can belong to multiple tags. Omit it on update to preserve membership, or send `[]` to clear it. IDs must refer to existing, non-deleted games.

- `GET /api/games?game_tag_id=<tag-id>`: games in an active tag.
- `GET /api/games?related_to=<game-id>`: games sharing any active tag, excluding the source game.
- These filters support existing pagination/search and intersect with `collection_id`. Deleted tags and games are excluded by the soft-delete model hooks.

### Game modes and series

Physical box art: `POST /api/games/media/boxart` accepts `{ title, platform_id }` and requires an admin. Set `THEGAMESDB_API_KEY` in the server environment to search TheGamesDB by exact title and console. Without a key, supported older consoles use the public Libretro thumbnail archive (coverage is limited, especially for PS4). PS5, Xbox One/Series and Switch require the TheGamesDB key. Responses contain front-cover URLs; these are not guaranteed to be full printable wraps. The dashboard's “دریافت کاور جعبه” button fills empty cover slots and preserves existing images. A no-key test example is `Dark Souls III` with PlayStation 4 (Japanese front cover).

Manage game modes at `/api/game-modes` and game series at `/api/game-series`. Both follow the genre API: list/create at the root, read/update/soft delete at `/:id`, options at `/all`, and ordering at `/reorder`. Mutations require an admin. Dashboard pages use the same paths.

Games accept `game_mode_ids` and `game_series_ids` as arrays of existing, non-deleted IDs (or JSON arrays in multipart requests). Omitted fields preserve membership; empty arrays clear it. Duplicate IDs are removed. Game detail returns IDs for editing; the game list populates names and slugs. Filter games with `game_mode_id` and/or `game_series_id`. Series membership is independent of curated collections and parent-game relationships.

# Automatic DLC and trophy media

When a game ID is available, DLC discovery imports each result automatically instead of stopping at preview. Trophy discovery and manual NPWR selection automatically import their matched lists too. Final game submission retains the existing completion/retry flow; there is no separate image-upload approval step for these records.

All providers share `automaticMedia.service.js`. Imports first persist English source fields, then create separate Persian fields and upload images through the global compression/preview pipeline to Cloudinary:

- `game/<game-name>/dlc/<dlc-title>/<dlc-title>-<random>.webp`
- `game/<game-name>/dlc/<dlc-title>/screenshot/<dlc-title>-<random>.webp`
- `game/<game-name>/trophy/<trophy-name>/<trophy-name>-<random>.webp`

Each uploaded image includes a compressed blurred preview. Storage keys and original source URL are retained. Successfully migrated images and screenshots are skipped on retry. If the database save fails after a cloud upload, the new cloud copies are removed. Translation or image failures leave the English text and successfully imported records intact and are exposed through `import_errors` and the import error response.

Achievements retain `name`, `description`, and `locked_description` and add separate `_en` and `_fa` fields for each. Technical source metadata (types, IDs, time windows, conditions, platform codes) remains unchanged. Cards display English names alongside Persian names and include the English description in details. PSN and Xbox requests already specify `Accept-Language: en-US`.

DLCs retain separate `title_en`, `title_fa`, `description_en`, `description_fa`, `short_description_en`, and `short_description_fa` fields. Editorial descriptions are preserved on re-import. The complete source response continues to be stored separately.

Verification: 42 focused backend tests passed, plus a browser smoke test verifying both DLC and trophy imports start without clicking any button. Tests mock cloud, translation and database writes; no real Cloudinary uploads or production migrations were performed.

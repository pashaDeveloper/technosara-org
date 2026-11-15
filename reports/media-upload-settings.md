# Media upload settings

The independent Upload button next to API Tokens in the dashboard header opens a left-side drawer with global upload controls and a generated sample image. Administrators can choose their own sample and compare the original, processed WebP, and actual blurred preview with their sizes. Preview requests use the same Sharp processing function as uploads and do not create cloud assets.

- `GET /api/upload-settings`: current persisted global settings and limits.
- `PATCH /api/upload-settings`: validate and persist settings in MongoDB (`UploadSettings`, ID `global`).
- `POST /api/upload-settings/preview`: one image plus JSON `settings`, returning processed data URLs and byte sizes.
- All three endpoints require an admin or superAdmin token.

The shared image middleware reads settings once per request, including routes that upload to both providers. Every processed image has a preview, including platform logos. Quality controls encode quality, not a guaranteed percentage reduction; already compressed inputs can grow.

## Games

`POST /api/games/media/upload` now explicitly selects Cloudinary. A `gameTitle` form field is required. Only one file is accepted per request. Paths are `game/<normalized-game-title>/<role>/<random-id>`:

| Input field | Role |
| --- | --- |
| thumbnail | card |
| detail_banner | cover |
| detail_poster | poster |
| detail_gif | animated |
| screenshot, cover, logo | same as input |
| video, trailer, gameplay, micro_trailer | same as input |

Platform cover requests additionally include their platform and quality in the path. Cloudinary's `asset_folder` and public ID both include the path. Images are encoded as WebP by Sharp before upload. Videos use an incoming H.264/MP4 transformation with the saved video quality and dimension limit, plus a synchronously generated JPEG preview. Video preview blur maps the shared blur control to Cloudinary's blur effect scale. Failed video uploads register video-resource cleanup, which also removes derivatives.

Images are limited to 5 MiB, videos to 100 MiB. PNG, JPEG and WebP are supported for still images. Game `detail_gif` accepts GIF/WebP with at most 150 frames. Video fields accept MP4, WebM, Ogg and QuickTime; Cloudinary validates the actual content, and the response must include video dimensions and the generated preview.

Screenshot/video file controls are included in the game form. XHR reports actual browser-to-server transfer progress; processing after transfer is shown as a separate indeterminate stage, not a fabricated percentage.

The generic `/api/upload/:folder` route supports existing dashboard image upload helpers for an explicit set of folders and uses the same settings and Cloudinary storage. Existing entity routes retain their provider choices.

Existing cloud assets and external URL references are not migrated, renamed, or recompressed by this change. Upload settings affect future file uploads. Independently uploaded game files are still committed before the game form is saved.

## Verification

13 focused backend tests pass, including compression dimensions, folder and role selection, preview settings, rollback, video transformation options, settings persistence through the API, and authorization. Cloudinary is mocked in tests. The dashboard production build passes.

The broader dashboard suite has an existing missing `server/routes/dashboard.route` dependency (23 pass, 1 fail). The existing MongoDB integration test cannot connect to `127.0.0.1:27017` in this environment. Real Cloudinary uploads were not performed.

Cloudinary upload semantics: https://cloudinary.com/documentation/eager_and_incoming_transformations and https://cloudinary.com/documentation/node_image_and_video_upload .

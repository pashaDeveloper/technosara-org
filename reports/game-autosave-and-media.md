# Game autosave and explicit image uploads

Selecting a Gamebrain suggestion now calls the authenticated `POST /api/games/lookup/:providerId` endpoint. On first selection it fetches full details and atomically upserts a draft by the unique numeric Gamebrain ID. The complete response is preserved in `gamebrain_source`; media files are not downloaded. Typed media fields are left empty until the reviewed form is submitted. Existing saved source data is returned without another Gamebrain request.

`GET /api/games/lookup` combines local saved games with provider suggestions and marks saved IDs. Local search remains usable if the provider fails. Search itself does not write games; selecting a suggestion does. Toasts report success or failure. Automatic drafts are unpublished. Final submission patches the saved record and clears `auto_draft`, preserving the existing publication status.

Description and short-description controls offer a circular reset icon that restores the Persian translation of the original Gamebrain text. Translations are reused during the form session; failed translation leaves the current text intact. Previously finalized game fields are loaded from the saved record rather than overwritten by source autofill.

Main covers, platform covers and screenshots use explicit upload buttons. Local selection stages a file with a plus-button picker, and final form submission is blocked until staged files are uploaded or removed. Existing source URLs can be imported through authenticated `/api/games/media/import`; the server restricts requests to public HTTPS endpoints, pins DNS resolution, validates every redirect, and limits bytes and time. All imports use the shared compression and Cloudinary pipeline.

Uploaded images show their resulting size and compression result and open in a plain image dialog. Screenshot batch upload runs sequentially, retains successful uploads when others fail, and skips already uploaded Cloudinary assets on retry. Each failed image remains individually retryable.

Video references are preserved as links. Local video-file upload remains available with shared video compression settings, progress and resulting size. Automatic download of external video files and a video batch-import feature are not included; those should remain explicit because videos can be large and platform/embed URLs are not downloadable media files.

Validation: focused backend tests cover draft creation, offline reuse, duplicate-free suggestion merging, preservation of manual edits, autosave errors, remote URL restrictions, compression/settings and rollback. Browser smoke tests cover lookup races, saved indicators, text reset, reuse of the saved ID on submit, sequential screenshot uploads, partial failure/retry and image zoom. Real external Gamebrain/Cloudinary writes and a live MongoDB round trip were not exercised in these tests.

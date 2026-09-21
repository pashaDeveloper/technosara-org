# Existing platform families

New platform forms send `family_id`, referencing `PlatformFamily`. The legacy `family` text is retained for existing clients and data.

To link existing text values to the new model, configure `MONGO_URI` and optionally `DB_NAME` in the server environment, then run from `server`:

```sh
node scripts/migrate-platform-families.js
```

The migration creates one family per normalized name and fills only missing `family_id` values. It preserves the old text and existing references and can be rerun. It is not executed automatically on server startup.

# Current scope

Base games and additional content now use separate models. See
[GAME-CONTENT.md](GAME-CONTENT.md) for the current collections, administrative
API and legacy data migration requirements.

Platform releases, platform families, store products and discovery previews have been removed. Their dependent offer/price/product-link models, import/review execution, scheduled workers and discovery UI have also been removed. Games are managed directly through the game forms. Existing database collections have not been deleted.

The workflow documentation below is historical and its import commands and removed endpoints are no longer available.

# Game catalog

## Live game discovery

The game form searches after three characters with a 400 ms debounce. Selecting
a store result creates a private, 24-hour preview and fills the form. Saving is
an atomic transaction; repeating the same preview is idempotent. Existing source
identities cannot create a second game. Select a suggested existing game, or open
its edit form, to attach another store product without creating another Game.

Admin-only endpoints under `/api/admin/games`:

- `GET /search?q=...`: independent provider results and per-provider availability.
- `POST /preview` with `{provider,id}`; `GET /previews/:id` refreshes mappings.
- `PUT /terms/:id` with `{target_ids:[...],ignore:false}` confirms existing IDs.
- `POST /previews/:id/commit` with `{values,game_id?}` persists the preview.
  `update_existing:true` explicitly applies edited values to an existing game.

External terms preserve provider identity and many-to-many target mappings.
Unique exact names/codes map automatically; fuzzy suggestions require selection.
Ambiguous companies and genres must be mapped or explicitly ignored; stores and
platforms cannot be ignored. No company, genre, platform or brand is automatically
created. Platform brand relationships remain on the existing Platform records.

`game-releases` is a compatibility alias over `game_platforms`, preserving all
existing IDs. Products grant releases through `store_product_releases`. The
migration backfills these links. `install_sizes` separates download, install and
required-storage observations with source, timestamp and bytes. Unknown sizes
are absent, not zero; Steam required storage is not treated as download size.

Steam store search/details and Xbox DisplayCatalog search/details are public
adapters with timeouts, bounded responses and short-lived caching. PlayStation's
official GraphQL search and store-page detail adapters report failures separately;
the search endpoint returned HTTP 403 from this environment during verification.
No authentication bypass is attempted. Provider endpoints can change.

Steam DLC IDs enqueue bounded, retryable background jobs. Each job verifies the
provider's parent app ID before creating DLC under the existing main game.
Xbox edition names are attached to Editions; included product IDs are preserved
as provider relations. Recursive Xbox bundle/add-on fetching is not implemented.
`STEAM_WEB_API_KEY` enables queued Steam achievement schema import; it is absent
in the current environment. Xbox achievements and PlayStation trophies require
separate authorized adapters and currently remain available via canonical JSON
imports. User entitlements, CDN/download links and language administration are
outside this workflow.

Verification: `node --test test/game-discovery.test.js test/catalog-domain.test.js`
with `CATALOG_TEST_URI` pointing to an isolated replica set, plus dashboard build.

The existing Express/Mongoose application now exposes the catalog workspace at
`/catalog` in the dashboard. No language models or language-management screens
are added.

## Deployment and existing data

1. Back up the database. Use a MongoDB replica set (including a single-node set)
   or Atlas: accepting or undoing a match is a multi-document transaction.
2. Set `MONGO_URI` and optionally `DB_NAME` in `server/.env`.
3. Run `node scripts/migrate-catalog.cjs` to inspect the migration report.
4. Resolve reported duplicate store identities and legacy Game records of type
   `edition`/`subscription`. The script deliberately does not guess their identity.
5. Run `node scripts/migrate-catalog.cjs --apply`. This writes a before-image of
   games/products under `reports`, copies platform memberships and company roles,
   populates release/publication statuses and installs the indexes. It replaces
   only the known old non-unique product-identity index. Retained legacy market/SKU
   fields are readable; new regional availability belongs to offers. Missing
   currency cannot be inferred and must be supplied when creating offers.
6. Build the dashboard and restart the server using the project's deployment flow.

Migration is not run implicitly at server startup. Existing `status` is retained
as a release-status compatibility alias; writes through the game API also set
`release_status`. `publication_status` independently holds draft/published/archived.
Imported games start as drafts. Existing crossplay false values are preserved;
only newly created unknown values default to null.

## Resources and access

All `/api/catalog/*` and `/api/catalog-sync/*` routes require the existing admin
Bearer token and admin/superAdmin role. Normal editing endpoints remain intact.

- `GET /api/catalog/schema`: field metadata for the administration screen.
- `GET /api/catalog/options/:model?search=...`: bounded reference picker.
- `GET /api/catalog/:resource?page=1&limit=20&game_id=...`: filtered list.
- `GET /api/catalog/:resource/:id`, `POST /api/catalog/:resource`,
  `PATCH /api/catalog/:resource/:id`, `DELETE /api/catalog/:resource/:id`.
- `GET /api/catalog/games/:id`: full aggregate for administrators, including drafts.
- `GET /api/games/:id/catalog`: aggregate for a published game.

Resources: `game-platforms`, `store-platforms`, `store-products`, `store-offers`,
`store-prices`, `subscriptions`, `store-product-subscriptions`, `editions`,
`edition-store-products`, `content-items`, `system-requirements`,
`features`, `game-features`, `achievement-groups`, `achievements`, `external-ids`,
`source-priority`, `field-sources`, `api-raw-responses`, `sync-logs`, `match-reviews`,
`import-jobs`.

Raw responses, logs, reviews and jobs are read-only through generic CRUD. Use the
workflow endpoints to modify them. Price history is append-only. Amounts use
Decimal128 and serialize to decimal strings, in the currency's major unit; send
`"9.99"`, not a floating-point calculation. Current prices are selected by the
latest `checked_at`; historical reads use `store-prices?offer_id=...`.

Products are unique per store/external product ID. A product supports multiple
platforms. SKU/market/currency identity and availability belong to StoreOffer.
Each product can link to one Edition through EditionProduct; multiple products
can link to the same Edition. Edition and bundle contents use ContentItem and
must have exactly one owner. DLCs remain Game records with a parent.

Achievement identity is provider + external set + external group; achievement
IDs are unique within that group. Unknown points are null. Group/game/platform
consistency is validated. Companies have per-game roles. Crossplay target
platforms can be represented by GameFeature.target_platform_ids.

## Import contract

Import a JSON file in the catalog screen, call `POST /api/catalog-sync/import`,
or set `CATALOG_ADMIN_ID` and run `node scripts/import-catalog.cjs input.json`.
The CLI also accepts an array of imports. Replace the example ObjectIds with
existing records. Decimal prices are strings.

```json
{
  "provider": "steam",
  "store_id": "000000000000000000000001",
  "platform_ids": ["000000000000000000000002"],
  "canonical": {
    "external_product_id": "1551360",
    "game": {
      "title": "Example Game",
      "content_type": "base_game",
      "release_status": "released",
      "description": "Source description"
    },
    "offers": [{
      "external_sku_id": "standard",
      "market": "US",
      "currency": "USD",
      "is_available": true,
      "price": {"regular_price": "59.99", "current_price": "29.99"}
    }]
  }
}
```

Optional canonical arrays: `companies`, `requirements`, `features`, `media`,
`age_ratings`, `external_ids`, `subscriptions`, `achievement_groups`. Each item
uses its resource's fields; game/product scope is supplied by the importer.
Achievement groups additionally contain an `achievements` array. Subscription
items identify their offer using SKU, market and currency. Referenced platform,
company, feature, subscription and edition records must already exist.

For captured source JSON use `adapter: "mapped-json-v1"`, `payload`, and `mapping`
instead of `canonical`. Mapping values are dot-separated field paths. Objects
map nested canonical objects, and `{ "path": "sourceArray", "items": {...} }`
maps arrays. Example:

```json
{
  "external_product_id": "ProductId",
  "game": {"title": "LocalizedProperties.0.ProductTitle"},
  "offers": {"path": "Offers", "items": {"market": "Market", "currency": "Currency"}}
}
```

This configurable adapter can ingest authorized Xbox, PlayStation, Steam, Epic
or other feed captures without leaking source formats to the frontend. Field
paths must be configured against that feed's actual response. The live discovery
workflow above supplies dedicated Steam, Xbox and PlayStation adapters.
Captured payloads remain in RawResponse.

## Matching, source ownership and recovery

Title/developer/publisher/release similarity is advisory. Only a verified external
identity is automatically linked. All other imports create a review, including
low-score candidates. An administrator chooses an existing game or explicitly
creates a draft:

- `POST /api/catalog-sync/reviews/:id/apply` with `{ "game_id": "..." }`
  or `{ "create_game": true }`.
- `POST /api/catalog-sync/reviews/:id/reject`.
- `POST /api/catalog-sync/reviews/:id/undo` detaches a newly established product
  association and its product external ID. It retains game content/history and
  refuses to undo an association superseded by a later synchronization. It is
  not a destructive merge of Game records.
- `POST /api/catalog-sync/raw/:id/replay` reprocesses a capture using its recorded
  canonical mapping context. Supply `{ "mapping": {...} }` to run a corrected
  mapping against the original raw payload. Capture timestamps are preserved;
  older captures cannot replace newer canonical field observations.

Accept/undo is transactional. A validation failure rolls back the game, product,
prices and related writes. Unique identities and upserts prevent duplicate
products. Manual game edits create locked FieldSource records. Existing nonempty
editorial data without provenance is treated as manual. Priority records control
which provider can replace an unlocked canonical field; `manual` must rank first.

## Queue and scheduler

`POST /api/catalog-sync/jobs` accepts `{ "input": <import>, "run_at": <ISO date> }`.
The normal server starts a queue worker after connecting to MongoDB. Set
`CATALOG_WORKER_ENABLED=false` to disable that worker when using a separate worker
process. You can also schedule `node scripts/catalog-worker.cjs`; each CLI run
drains currently due jobs and exits. Jobs use atomic claims, renewable leases and
bounded exponential retry (five attempts). Invalid references/identity conflicts
fail without automatic repeated application. This command is provided but no
operating-system scheduled task is installed automatically.

## Verification

`node --test test/catalog-domain.test.js test/game-classifications.test.js`
tests the domain. Set `CATALOG_TEST_URI` to an isolated test replica-set URI to
enable the integration test. It creates and drops only its generated
`technosara_catalog_test_*` database. The integration test covers import/review,
repeat sync, exact prices, manual locks, invalid references, transaction rollback,
undo guards, queue consumption and authorization. Dashboard: `npm run build`.

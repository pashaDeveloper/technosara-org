# Game catalog models

Game stores base games. Edition is a separate model in editions with game_id,
name, slug, description, release_date and is_base_edition, plus baseSchema.
The game/slug pair is unique. A partial unique index allows one non-deleted
base edition per game. Edition is not a GameContent type.

GameContent stores DLC, expansions, season passes, addons, packs, currency,
upgrades, soundtracks, demos, trials, bundles, subscriptions and other content.
Containers store embedded items. Each item references exactly one game_id,
content_id or edition_id. Bundles/subscriptions can include editions; season
passes can only include additional content belonging to their own game.
Missing references, duplicate items and cycles are rejected.

StoreProduct stores provider IDs separately and references exactly one game,
content or edition. GamePlatform stores platform-specific release and cross
play/save/progression information. Game uses status as its release state.

Authenticated CRUD is available at /api/editions, /api/game-contents,
/api/store-products and /api/game-platforms, or under /api/catalog using
these resource names. The dashboard catalog exposes these resources.
Game catalog details include editions as a separate array.

## Steam DLC import

The game editor provides Steam DLC discovery and per-item imports for saved
games with official Steam links or Steam StoreProducts. Authenticated admin
endpoints are POST /api/games/:id/dlc/discover and POST
/api/games/:id/dlc/import (app_id, parent_app_id). Discovery unions appdetails
and dlcforapp results across the saved parent apps, with explicit per-parent
errors. This is the visible US/English Steam catalog, not a guarantee of every
historical or console-exclusive DLC. An existing app ID can also be imported
directly when no longer listed, provided its details remain accessible.

Every import checks the provider's fullgame.appid against a saved parent app
and requires a title and full description. Music becomes soundtrack; other
verified DLC remains dlc without guessing a more specific subtype from its
title. New content is draft. Steam identifiers and prices live on StoreProduct.
GameContent retains descriptions, media, developers, publishers, languages,
platforms, system requirements, release information, and the complete Steam
response in source_data (excluded from ordinary reads). Unknown dates stay
null, with original release text retained. Subsequent imports preserve manual
content fields and refresh the raw source, sync timestamp and store offer.
Failed detail requests are retryable and never counted as successfully saved.

The editor now defaults to console sources. POST /api/games/dlc/discover
accepts title and official_stores/offers; POST /api/games/dlc/preview also
accepts provider (xbox/playstation), app_id and parent_app_id. These verify the
provider relationship and return normalized details without database writes.
The editor automatically discovers and previews details when its console
links/title change, cancels stale requests, then imports the queued IDs after
the main game is saved. Game creation returns
data._id so the editor can attach the content before navigating away. Preview
results are never accepted as authoritative during import: details and the
saved parent relationship are checked again. A failure after game creation
opens the saved game's editor instead of retrying creation or hiding failures.

## Console DLC sources

Xbox uses the same current endpoints as xbox.com: POST
https://emerald.xboxservices.com/xboxcomfd/browse?locale=en-US with channel
ProductAddOns_<productId>, X-MS-API-Version: 1.1, and an MS-CV correlation
vector; details use https://displaycatalog.mp.microsoft.com/v7.0/products/ID.
Continuation tokens are followed and totals checked. HTTP 200 with a "Failed
to Get Channel" body is an error, never an empty successful list.

Sony uses https://web.np.playstation.com/api/graphql/v1/op with the current
getAddOnProductsByConcept persisted operation. Its sorted operation text is
in data/sony-addon-query.graphql. This matches the operation in Sony's WCA
addOns component, including __typename fields and sortAST ordering. Requests
include Content-Type: application/json and X-Psn-Store-Locale-Override: en-us.
PageArgs size/offset pagination is followed until exhausted, with duplicate
page detection. Details are read from the official product page's structured
WCA API caches, including descriptions, media, compatibility, languages,
ratings, release date, and classification. The old chihiro API is not used.

When no Sony store URL is supplied, the official playstation.com game page
derived from the title supplies the product link. No fuzzy title search is
used to attach DLC. If that page cannot resolve, the UI reports it and an
explicit PlayStation product/concept URL can be supplied instead. Xbox cloud
and storefront URLs with the same product ID are deduplicated. Cross-platform
products retain separate identities; name similarity alone never merges them.

All content relationships are checked against the parent's complete add-on
list. Import verifies again using the saved game's links/title. New content
is draft; refresh preserves editorial fields. Raw source data and store
prices remain available in the same models as the Steam importer. Sony's
explicit VIRTUAL_CURRENCY classification is retained as currency. Xbox
consumables are kept as addons rather than guessing that every consumable is
currency. Missing images/videos/languages are not invented.

These are internal public storefront endpoints, without a public stability
contract. Schema/operation errors remain visible. Successful parent lists are
cached for five minutes; failed requests are not cached. Reproduce the live
GTA V audit with node scripts/audit-console-dlc.cjs. Its JSON report goes to
reports/console-dlc-gta-v.json; this audit makes no database writes.

## Base-game trophies via PlatPrices

Set PLATPRICES_API_KEY in server/.env and restart the server. This is a separate
provider key, not GAMEBRAIN_API_KEY. All calls use the current v2 API with the
X-API-Key header and an explicit US region. Successful results are cached for
one hour per key/URL. No searches run automatically while typing.

The editor's trophy section lets the administrator search for a product,
choose its PS4/PS5 platform, and preview its base trophy list. A successful
preview is imported after saving the game, or explicitly for an existing
game. Endpoints: GET /api/games/trophies/status, POST
/api/games/trophies/candidates (title), POST /api/games/trophies/preview
(ppid, platform, optional region), POST /api/games/:id/trophies/import (same).
All endpoints require an administrator. Status exposes only whether the key
is configured. Product/platform consistency, list ID, unique trophy IDs,
total count and counts by grade are checked before importing anything.

Imports reuse a base_game AchievementGroup and stable Achievement external
IDs, preserve manual trophy edits, and reject a source set already assigned
to another game. Every trophy has is_dlc=false and dlc_id=null. The external
set ID is namespaced with the selected platform to keep PS4 and PS5 separate.
This provider endpoint contains base trophies only. There is no PSN login
or trophy-DLC import in this workflow. Upstream errors never echo API keys.
The UI displays PlatPrices attribution beside retrieved data.

No existing database records or indexes were migrated. Existing edition
records in game_contents require migration to editions (title becomes name,
preserve IDs and update content_id links to edition_id). Existing edition
items need an explicit preservation plan; this Edition model contains only
the requested fields and does not embed contents. Legacy base-edition indexes
on game_contents should be reviewed during migration. Back up data first.

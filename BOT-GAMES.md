# Game bots: direct panel database connection

Both bots now read games and game dependencies directly from the panel MongoDB.
The active game read path does not use the panel HTTP API or the bots' own game collections.
Existing bot MongoDB settings remain in use for customers, VPN and other services.

## Configuration

In each bot .env:

```dotenv
GAME_PANEL_MONGODB_URI=<same MongoDB URI used by the panel>
GAME_PANEL_MONGODB_DATABASE=<panel database name; blank uses the URI database>
```

Local settings were copied from server/.env without changing the panel database.
For deployment, use a database address reachable from the bot host/container.
The direct reader only issues reads and ping. The manager registration flow writes games, media and game_platforms atomically using MongoDB transactions.
Manager reads include draft games; customer game reads require publication_status=published.
Both exclude soft-deleted records. Dependency collection names match the panel models.

The manager game menu reads game and dependency lists directly. The customer game menu
reads published games. Manager registration asks for a title, an existing panel platform and a low-quality cover, then confirmation. It creates a draft, a cover and a game-platform relationship. The previous HTTP adapter and API routes are unused by active bot reads.

Restart both bots after changing connection settings:

```powershell
node start-bots.mjs
```

## Platform covers

Media now supports platform_id, pic1 and pic2.
The two qualities are independent files. A low-only cover uses pic1 as its url;
after adding pic2 in the panel media editor, url uses the high-quality file.
Existing media without platform_id or quality fields remain supported.
The panel media editor exposes these fields automatically through the catalog schema.

The manager bot needs CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.
Local Cloudinary values were aligned with the panel. Images are uploaded to Cloudinary;
only their URLs and metadata go into the panel database. The MongoDB account needs transaction
write access to games, media and game_platforms and read access to platforms.
Registration retries reuse stable IDs. Records are drafts with status upcoming until edited in the panel.

## Canonical game title search

The registration name step searches Steam, Xbox and PlayStation through the panel:
GET /api/bot/games/search?query=... (manager bot key required).
Set GAME_PANEL_API_URL and GAME_PANEL_API_KEY in the manager bot.
The panel server must run for this search; database reads and registration still use MongoDB directly.
The user must select a result before choosing the platform and uploading pic1.
Typed search text is never used as the saved game title. Empty results allow another search.
Each search has a fresh token so old result buttons cannot select a different title.

## Alternative PlayStation title source

PlayStation title search uses Sony's Chihiro endpoint without an API key:
https://store.playstation.com/store/api/chihiro/00_09_000/tumbler/US/en/19/{gameName}?size=8&suggested_size=0
The game name is URL-encoded. Results retain Sony product IDs and US store links,
with platforms and artwork when supplied. RAWG_API_KEY is not used for title search.
Malformed responses and HTTP errors mark PlayStation unavailable rather than returning unrelated sources.
Xbox and Steam searches remain unchanged. Restart the panel server and manager bot.
This replaces title search only; the panel's Sony product-details adapter is separate.

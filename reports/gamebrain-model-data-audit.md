# GameBrain compatibility audit — 2026-11-06

## Result

The Game schema covers the documented GameBrain detail fields and the checked-in response. Full equality between provider data, persisted relations and both dashboard entry paths is not established.

## Verified

- 18 server tests passed across gamebrain, gamebrain-import, gamebrain-canonical and gamebrain-catalog.
- 4 dashboard game-form tests passed.
- The dedicated importer resolves genres, themes, play modes, platforms, tags and developer records; stores media, store products and optional news; and runs each game import in a transaction.
- Provider numeric IDs remain separate from MongoDB ObjectIds. Missing numeric values and the literal `"null"` are not converted to zero by the dedicated mapper.
- Global input, price and rating filters are catalog choices, not asserted properties of every game.

## Differences requiring attention

1. `server/services/gamebrainImport.service.js` unions existing reference IDs with incoming IDs (`mergeIds`). Platform links, tag memberships, media and store products are upserted without pruning prior source relationships. An updated provider response can therefore disagree with the local relationships. Preserving local edits is intentional in existing tests, but no per-relation provenance distinguishes local additions from outdated provider additions.
2. `dashboard/src/pages/games/GameForm.jsx` uses `matchProviderOptions` for developer, genre, play-mode and theme selections. Unmatched or ambiguous options become no selection. The regular save endpoint does not invoke the dedicated importer, so it does not create missing dependencies, GamePlatform links, tag memberships, Media or StoreProduct records from the provider arrays. A saved provider array is not evidence that its dependent records exist.
3. The regular form automatically translates `description` and `short_description` into Persian, whereas the dedicated importer stores the source text. Those fields are not byte-for-byte equal between the two paths. Separate source and translated fields would be needed if both must be retained.
4. The regular form accepts raw provider values while the dedicated mapper cleans numeric rating/playtime values. Existing form tests do not establish that every upstream nullable numeric variant saves through both paths identically.

## Live data verification

The network-enabled read-only retry succeeded against `technosara`. All 524 live provider catalog choices across 11 groups exist locally with matching `value`, English `name` and `name_en`; none of those provider keys had duplicate local matches. There are also 43 local-only entries: 7 platforms, 3 genres, 5 play modes, 13 tags and 15 features. Local-only entries were preserved.

There is 1 game in this database and 0 games with a numeric GameBrain `id`. Consequently no persisted game could be compared to a provider detail response by source identity. This is a verification gap, not a successful game-data equality check. No database mutation was performed by this audit. The complete live result is `reports/gamebrain-audit.json`.

`server/scripts/audit-gamebrain.cjs` performs read-only live filter/catalog comparisons and compares each linked game's mapped fields and expected relation memberships. It writes `reports/gamebrain-audit.json` only after a successful run. Its relation checks detect missing expected memberships; they do not prove absence of all stale relations or validate all dependent media/store fields.

Reference: https://gamebrain.co/api/docs/game-detail

# GameBrain autofill and storage — 2026-11-06

The regular dashboard form now submits the selected full GameBrain detail response as `gamebrain_source` when the administrator presses Save. Selecting a suggestion still performs no catalog write. Create and update route that submission through the existing transactional importer, so missing developer, genre, theme, play-mode, platform, tag, media and store-product records are resolved or created alongside the game. Invalid or ambiguous mappings roll back the operation.

`Game.gamebrain_source` preserves the complete response, including literal `"null"`, JSON nulls, false flags, zero prices and future fields unknown to today's typed schema. The existing typed fields and ObjectId relationships remain available for queries and editing. Translated or edited descriptions are stored in the editable fields; the original description remains in the source response. The dedicated import path also stores the complete response.

The form removes nonnumeric rating/playtime values from typed inputs without changing the source response. Selecting a different game resets omitted provider fields to prevent data from the previous selection carrying over. Local fields such as publisher and series remain independent.

Theme has no validation hook for slug or name_en. The save/import services provide name_en and derive missing slugs through `utils/slug.js` from name_en. Its collection is `themes`. Related catalog collection names use plural snake_case matching their model names; `server/scripts/migrate-catalog-collection-names.cjs` migrates existing collections while retaining records, IDs, indexes and references.

Existing local relationship IDs continue to be merged with provider IDs. This deliberately allows local additions; exact source membership is retained separately in `gamebrain_source`. This change does not delete local-only catalog records or existing relations. Existing games are not automatically backfilled until a selected response is saved/imported.

Verification: targeted GameBrain/import/review tests and dashboard form tests, plus a production dashboard build. The general server suite also ran, but its MongoDB integration tests could not connect to the default local test server at `127.0.0.1:27017`. No production database write was made during implementation or tests.

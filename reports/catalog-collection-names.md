# Catalog names — 2026-11-06

Applied to database `technosara`. Model names remain singular PascalCase; collection names use plural snake_case matching the model. API resources use the corresponding hyphenated names.

| Model | Previous collection | Current collection | Records |
| --- | --- | --- | ---: |
| Theme | game_themes | themes | 19 |
| InputMode | game_input_modes | input_modes | 4 |
| ReleaseWindow | game_release_windows | release_windows | 4 |
| PriceRange | game_price_ranges | price_ranges | 5 |
| ContentRating | game_age_categories | content_ratings | 3 |
| ReviewRating | game_review_ratings | review_ratings | 4 |
| News | game_news | news | 0 |
| FilterOption | gamebrain_filters | filter_options | 11 |
| SortingOption | gamebrain_sort_options | sorting_options | 3 |
| GameTag | gametags | game_tags | 337 |

390 documents were retained. The migration saved an Extended JSON backup, renamed the collections and checked complete document hashes and index definitions after each rename. IDs and ObjectId reference targets did not change. A second preview found every rename already complete. Other correctly named collections, including `game_platforms`, `game_modes`, `store_products` and `game_series`, were retained.

The catalog resource registry, canonical route mappings, GameBrain catalog resource mappings and dashboard theme-options request were updated. Old names remain only in the migration manifest and historical reports/backups. The running development server reloads changes through nodemon.

A fresh read-only GameBrain audit after migration found all 524 provider catalog entries present with matching keys and English names, with no missing entries or duplicate provider keys. Existing local-only entries remain.

Migration details: `catalog-collection-names-result.json`. Backup path is recorded in that result. Repeatable command: `node server/scripts/migrate-catalog-collection-names.cjs --expected-db=technosara` for preview; add `--apply` to apply. The script refuses to overwrite a populated destination when the source also contains records.

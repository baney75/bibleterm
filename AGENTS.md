# bibleterm Agent Notes

## Scope

These rules apply to work inside `/Users/baney/Documents/Software/bibleterm`.

## Verification

- Run `bun test` for behavior changes.
- Run `bun run typecheck` for TypeScript changes.
- Run `bun src/main.ts --doctor` before closing any data-pipeline or translation-surface change.
- Prefer `bun run verify` when touching multiple subsystems.

## Translation Data Rules

- `BIBLETERM_DATA_DIR` is the canonical override for fixture, local-dev, and installed-data checks.
- Do not present a translation in UI or docs unless `getAvailableTranslations()` reports it healthy.
- `getInstalledTranslations()` is for raw folder discovery only; use `inspectTranslation()` when health matters.
- Bundled English data currently comes from `bibleapi/bibleapi-bibles-json`; keep that importer replaceable and document the interim licensing caveat in maintainer-facing docs.
- Preserve per-chapter runtime file compatibility unless a separate storage migration is explicitly planned.
- Do not advertise `WEB` or `YLT` unless healthy corpora and docs land in the same change.

## Testing Notes

- Loader and doctor tests should use temp fixture directories via `BIBLETERM_DATA_DIR`.
- Regression tests for translation integrity should cover both missing books and non-sequential or duplicate verses.
- Startup regressions should prove the app fails with a repair instruction when no healthy translation data exists.
- Red-letter changes should validate common passages such as `john 3:16`, `john 14:6`, and `revelation 22:20`.
- `src/data/red-letter.json` is the runtime red-letter source of truth; keep `scripts/build-redletter.ts` aligned with it.

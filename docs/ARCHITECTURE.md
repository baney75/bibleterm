# bterm Architecture

## Runtime Shape

`bterm` is a single-process terminal app driven by one render loop in `src/main.ts`.

- Input source: raw TTY keyboard events
- State source: `src/state.ts`
- Data source: `src/data/loader.ts`
- Search engine: `src/search.ts`
- Reference parser: `src/reference.ts`

## Core Modules

## `src/main.ts`

- Owns app lifecycle, key handling, rendering, and mode switching.
- Modes: `reading`, `search`, `modal`.
- Handles terminal cleanup (`alternate screen`, `cursor visibility`, `raw mode reset`).
- Routes non-interactive CLI subcommands such as `bterm upgrade` before TTY setup.

## `src/meta.ts`

- Runtime source of truth for version and repository metadata.
- Keeps CLI/version/help output aligned with release metadata.

## `src/entry.ts`

- Published package entrypoint for `bun install -g bibleterm`.
- Bootstraps the updateable local install tree on first run or when the packaged version changes.
- Hands execution off to the installed app so `bterm upgrade` and normal launches stay on the same code/data path.

## `src/install-layout.ts`

- Resolves the installed app/data/bin locations.
- Replaces installed source/data as one operation so stale corpora cannot survive reinstall or upgrade.
- Writes the user launcher and its environment contract.

## `src/upgrade.ts`

- Fetches the latest GitHub Release metadata for `baney75/bibleterm`.
- Downloads and validates the release tarball before replacing the install tree.
- Revalidates bundled Bible data after install so `bterm upgrade` cannot leave a broken install behind.

## `src/ui/ascii.ts`

- Generated branding asset used by the startup splash and CLI help/upgrade output.
- Keeps runtime banner rendering deterministic without requiring figlet on user machines.

## `src/state.ts`

- Tiny global store with `getState`, `setState`, `subscribe`.
- Keeps UI mode, selected translation, current book/chapter, search query.

## `src/data/loader.ts`

- Loads offline JSON by translation.
- Normalizes chapter/verse structures.
- Separates installed translations from healthy translations.
- Uses `BIBLETERM_DATA_DIR` as the highest-priority data-dir override.
- Exposes translation inspection so the UI and doctor command can hide unhealthy corpora.

## `src/data/import-bibleapi-json.ts`

- Transforms the whole-Bible `bibleapi/bibleapi-bibles-json` source into the per-chapter runtime layout.
- Validates canonical book coverage, chapter counts, verse sequencing, and numeric-book slug normalization.
- Keeps importer logic testable outside the networked download script.

## `scripts/download-bibles.ts`

- Orchestrates English source fetches for bundled `ASV` and `KJV`.
- Uses staged writes so a failed import never leaves partial translation data in place.
- Treats `bibleapi/bibleapi-bibles-json` as an interim source and should stay replaceable.

## `scripts/build-redletter.ts`

- Normalizes and validates `src/data/red-letter.json`, which is the runtime red-letter source of truth.
- Must preserve common-red-letter passages such as `John 3:16`.

## `src/search.ts`

- Builds in-memory verse index.
- Applies weighted ranking for exact phrase and term matches.
- Returns ranked result objects for UI rendering.

## `src/reference.ts`

- Parses typed references into `{ bookSlug, chapter, verse? }`.
- Supports aliases and shorthand names.
- Isolated so parser changes do not destabilize `main.ts`.

## Install Layout

Installed by `scripts/install.ts`:

- launcher: `~/.local/bin/bterm`
- app: `~/.local/share/bibleterm/app`
- data: `~/.local/share/bibleterm/data`

Launcher executes Bun directly on installed `src/main.ts`, exporting:

- `BTERM_INSTALL_ROOT`
- `BTERM_APP_ROOT`
- `BTERM_INSTALL_MODE`
- `BIBLETERM_DATA_DIR`

`bterm upgrade` uses the same install layout and replacement code as first-time install.

Published Bun package installs (`bun install -g bibleterm`) also converge into this same layout through `src/entry.ts`.

## Testing and Verification

- Unit tests: `src/*.test.ts`
- Typecheck: `tsc --noEmit`
- Build gate: Bun compile build
- Health gate: `bterm --doctor` validates every installed translation and fails if any installed corpus is unhealthy
- Import gate: `bun run download` must leave bundled `ASV` and `KJV` healthy
- Upgrade gate: `bterm upgrade` must be validated against a published GitHub Release before advertising a new version

Run all with:

```bash
bun run verify
```

## Maintenance Guidelines

- Keep parser/search logic out of `main.ts` when possible.
- Add tests for non-obvious behavior before refactoring.
- Keep shipped/default translation claims aligned with the actual healthy data set.
- Preserve chapter-file compatibility unless a separate runtime storage migration is explicitly planned.
- Treat `src/data/red-letter.json` as the runtime source of truth unless the builder workflow is changed in the same patch.
- Regenerate `src/ui/ascii.ts` with `bun run ascii:generate` when the project banner changes.
- Prefer small commits touching one subsystem at a time.

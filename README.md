# bterm

Fast offline Bible reader for the terminal (Ghostty, iTerm2, macOS Terminal, Linux TTYs).

## Features

- Offline reading with local data
- 66-book canonical navigation
- Healthy multi-translation support with bundled `ASV` and `KJV`
- Ranked full-text search
- Reference jump (`john 3:16`, `1 jn 4:8`)
- Red-letter highlighting and multi-verse copy

## Requirements

- Bun 1.0+ on your PATH
- Interactive terminal (TTY)

## Website

- https://baney75.github.io/bibleterm/

## Quick Start

```bash
curl -fsSL https://raw.githubusercontent.com/baney75/bibleterm/main/scripts/install-release.sh | bash
bterm --doctor
bterm
```

This installs a global `bterm` launcher backed by the latest published GitHub Release under `~/.local/share/bibleterm`. After that, users stay current with `bterm upgrade`.

## Install for Users

```bash
curl -fsSL https://raw.githubusercontent.com/baney75/bibleterm/main/scripts/install-release.sh | bash
bterm --doctor
bterm
```

Update installed users with:

```bash
bterm upgrade
```

After that, `bterm upgrade` is the supported update path.

## Global Bun Package

The package metadata is prepared for:

```bash
bun install -g bibleterm
```

Actual publish from this machine is still blocked until npm authentication is configured. Until then, the release installer above is the supported user path.

## Install for Development

```bash
bun install
bun run install
```

This installs:

- Launcher: `~/.local/bin/bterm`
- App files: `~/.local/share/bibleterm/app`
- Bible data: `~/.local/share/bibleterm/data`

If `~/.local/bin` is not on your PATH, add it:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Usage

```bash
bterm
bterm upgrade
bterm --help
bterm --version
bterm --doctor
```

`--doctor` validates every installed translation and exits nonzero if any installed corpus is unhealthy.
`upgrade` pulls the latest published GitHub Release and replaces the installed app/data tree.

Bundled English imports currently come from `bibleapi/bibleapi-bibles-json` as an interim source. The importer is replaceable, and maintainers should verify licensing before changing redistribution assumptions.

## Keybinds

- `Up/Down`, `j/k`: move verse (or books when sidebar focused)
- `Left/Right`: previous/next chapter
- `[` and `]`: previous/next book
- `PgUp/PgDn`: jump 10 verses
- `g` / `G`: top/bottom of chapter
- `/`: search text or reference
- `v`: mark a verse range for multi-verse copy
- `Enter` or `y`: copy selected verse or marked range
- `Tab`: toggle sidebar focus
- `Esc`: clear marked range
- `t`: translation picker
- `c`: color theme picker
- `?`: help modal
- `q`: quit

## Development

```bash
bun run dev
bun run check
bun run verify
bun run test
bun run typecheck
bun run build
```

## Maintainer Workflow

1. Make changes in `src/`.
2. Run `bun run verify`.
3. Review staged files: `git diff --staged`.
4. Commit with clear intent in message.

For helpers, see `CONTRIBUTING.md` and `scripts/commit-ready.sh`.

## Maintainer Safety Nets

- CI runs `bun run ci` on every push/PR: `.github/workflows/ci.yml`
- Dependency review runs on PRs: `.github/workflows/dependency-review.yml`
- Dependabot keeps Bun deps and GitHub Actions current: `.github/dependabot.yml`
- PR template and issue templates enforce reproducible reports and checks

## Verification

```bash
bun run verify
```

Expected healthy output includes:

- `installed: ASV, KJV`
- `healthy: ASV, KJV`
- `books: 66`
- `chapters: 1189`
- `verses: 31103`
- `status: ok`

Installed-user recovery should prefer:

- `bterm upgrade`

## Project Docs

- Contributor guide: `CONTRIBUTING.md`
- Architecture map: `docs/ARCHITECTURE.md`
- Release checklist: `docs/RELEASE_CHECKLIST.md`
- Changelog: `CHANGELOG.md`
- Website: `https://baney75.github.io/bibleterm/`

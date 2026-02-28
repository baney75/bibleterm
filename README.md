# bterm

Fast offline Bible reader for the terminal (Ghostty, iTerm2, macOS Terminal, Linux TTYs).

## Features

- Offline reading with local data
- 66-book canonical navigation
- Multi-translation support (`ASV`, `KJV`, `WEB`)
- Ranked full-text search
- Reference jump (`john 3:16`, `1 jn 4:8`)
- Red-letter highlighting and quick verse copy

## Requirements

- Bun 1.0+ on your PATH
- Interactive terminal (TTY)

## Install

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
bterm --help
bterm --version
bterm --doctor
```

## Keybinds

- `Up/Down`, `j/k`: move verse (or books when sidebar focused)
- `Left/Right`: previous/next chapter
- `[` and `]`: previous/next book
- `PgUp/PgDn`: jump 10 verses
- `g` / `G`: top/bottom of chapter
- `/`: search text or reference
- `Enter` or `y`: copy selected verse
- `Tab`: toggle sidebar focus
- `t`: translation picker
- `?`: help modal
- `q`: quit

## Development

```bash
bun run dev
bun run test
bun run typecheck
bun run build
```

## Verification

```bash
bterm --doctor
```

Expected healthy output includes:

- `books: 66`
- `chapters: 1189`
- `verses: 31102`
- `status: ok`

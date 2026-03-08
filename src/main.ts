#!/usr/bin/env bun

import { getState, setState, subscribe, type Translation } from "./state";
import { VERSION, DEFAULT_UPGRADE_COMMAND } from "./meta";
import {
  getAvailableTranslations,
  getInstalledTranslations,
  inspectTranslation,
  loadBible,
  type Bible,
  type Book,
  type Chapter,
} from "./data/loader";
import {
  buildCopyPayload,
  getVerseSelectionRange,
  isVerseWithinSelection,
} from "./passage";
import {
  buildSearchIndex,
  findRelatedVerses,
  getSearchTerms,
  search,
  type SearchResult,
} from "./search";
import { isRedLetter } from "./data/redletter";
import { parseReferenceInput, type ParsedReference } from "./reference";
import { FALLBACK_WORDMARK, renderSplashBanner, shouldShowSplash } from "./ui/ascii";
import { getTheme, getThemeOptions } from "./ui/theme";
import { runUpgrade } from "./upgrade";

const ESC = "\x1b";
const CLEAR = `${ESC}[2J${ESC}[H`;
const ALT_SCREEN_ON = `${ESC}[?1049h`;
const ALT_SCREEN_OFF = `${ESC}[?1049l`;
const RESET = `${ESC}[0m`;
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const FG_BRIGHT_WHITE = `${ESC}[97m`;

type ModalKind = "translation" | "theme" | "help";

interface HeaderRender {
  lineCount: number;
  text: string;
}

class BibleTerm {
  private bibleByTranslation = new Map<Translation, Bible>();
  private bible: Bible | null = null;
  private running = true;
  private needsRender = true;
  private termWidth = 80;
  private termHeight = 24;

  private selectedVerseIndex = 0;
  private readerStartVerse = 0;
  private copyAnchorVerseIndex: number | null = null;

  private searchResults: SearchResult[] = [];
  private searchSelectedIndex = 0;
  private searchOffset = 0;

  private availableTranslations: Translation[] = ["ASV"];
  private readonly themeOptions = getThemeOptions();
  private modalKind: ModalKind = "translation";
  private modalIndex = 0;

  private statusMessage = "";
  private statusUntil = 0;
  private cleanedUp = false;

  async init(): Promise<void> {
    this.updateTerminalSize();

    this.availableTranslations = getAvailableTranslations();
    if (this.availableTranslations.length === 0) {
      console.error(getHealthyDataMissingMessage());
      process.exit(1);
    }

    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      console.error("bterm requires an interactive terminal (TTY).");
      process.exit(1);
    }

    await this.showSplash();

    const initialTranslation = this.availableTranslations.includes("ASV")
      ? "ASV"
      : this.availableTranslations[0];
    this.loadTranslation(initialTranslation);

    process.stdout.write(`${ALT_SCREEN_ON}${ESC}[?25l${CLEAR}`);
    if (typeof process.stdin.setRawMode !== "function") {
      this.cleanupAndExit(1, "TTY raw mode is unavailable in this terminal session.");
      return;
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", (data: string) => this.handleInputChunk(data));
    process.stdout.on("resize", () => {
      this.updateTerminalSize();
      this.needsRender = true;
    });

    process.on("SIGINT", () => this.quit());
    process.on("SIGTERM", () => this.quit());
    process.on("uncaughtException", (err) => {
      this.cleanupAndExit(1, `Unhandled error: ${err instanceof Error ? err.message : String(err)}`);
    });
    process.on("unhandledRejection", (reason) => {
      this.cleanupAndExit(
        1,
        `Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`
      );
    });

    subscribe(() => {
      this.needsRender = true;
    });

    this.needsRender = true;
    const loop = setInterval(() => {
      if (!this.running) {
        clearInterval(loop);
        this.cleanupAndExit();
        return;
      }

      if (this.needsRender) {
        this.render();
        this.needsRender = false;
      }
    }, 33);
  }

  private async showSplash(): Promise<void> {
    if (!process.stdin.isTTY || !process.stdout.isTTY) return;
    if (typeof process.stdin.setRawMode !== "function") return;
    if (!shouldShowSplash(this.termWidth, this.termHeight, process.env)) return;

    const banner = renderSplashBanner(this.termWidth, this.termHeight);
    const lines = banner.split("\n");
    const content = [
      ...lines,
      "",
      `${DIM}v${VERSION}${RESET}`,
      `${DIM}Press any key to continue${RESET}`,
    ];

    process.stdout.write(CLEAR + content.join("\n") + "\n");

    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        process.stdin.off("data", onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write(CLEAR);
        resolve();
      };

      const onData = () => finish();
      const timer = setTimeout(finish, 900);

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once("data", onData);
    });
  }

  private updateTerminalSize(): void {
    this.termWidth = process.stdout.columns || 80;
    this.termHeight = process.stdout.rows || 24;
  }

  private loadTranslation(translation: Translation): void {
    let bible = this.bibleByTranslation.get(translation);
    if (!bible) {
      const loaded = loadBible(translation);
      if (!loaded) {
        this.flash(`Failed loading ${translation}`);
        return;
      }
      bible = loaded;
      this.bibleByTranslation.set(translation, bible);
    }

    this.bible = bible;
    buildSearchIndex(bible);

    const firstBook = bible.books[0];
    setState({
      translation,
      mode: "reading",
      focus: "reader",
      currentBook: firstBook.slug,
      currentChapter: 1,
      searchQuery: "",
    });

    this.selectedVerseIndex = 0;
    this.readerStartVerse = 0;
    this.copyAnchorVerseIndex = null;
    this.searchResults = [];
    this.searchSelectedIndex = 0;
    this.searchOffset = 0;
    this.flash(`Loaded ${translation}`);
  }

  private getCurrentBook(): Book | null {
    if (!this.bible) return null;
    const state = getState();
    return this.bible.books.find((b) => b.slug === state.currentBook) ?? null;
  }

  private getTheme() {
    return getTheme(getState().theme);
  }

  private getCurrentBookIndex(): number {
    if (!this.bible) return -1;
    const state = getState();
    return this.bible.books.findIndex((b) => b.slug === state.currentBook);
  }

  private getCurrentChapter(): Chapter | null {
    const book = this.getCurrentBook();
    if (!book) return null;
    const state = getState();
    return book.chapters.find((c) => c.chapter === state.currentChapter) ?? null;
  }

  private clampVerseIndex(): void {
    const chapter = this.getCurrentChapter();
    if (!chapter) {
      this.selectedVerseIndex = 0;
      return;
    }
    this.selectedVerseIndex = Math.min(
      Math.max(0, this.selectedVerseIndex),
      Math.max(0, chapter.verses.length - 1)
    );
  }

  private handleInputChunk(chunk: string): void {
    const tokens = this.tokenizeInput(chunk);
    for (const token of tokens) {
      this.handleInput(token);
    }
  }

  // Terminals can batch multiple escape sequences and UTF-8 chars in one read.
  // Split into normalized tokens so key handling stays deterministic.
  private tokenizeInput(chunk: string): string[] {
    const tokens: string[] = [];
    let i = 0;

    const esc3 = new Set(["\x1b[A", "\x1b[B", "\x1b[C", "\x1b[D"]);
    const esc4 = new Set(["\x1b[5~", "\x1b[6~"]);

    while (i < chunk.length) {
      const rest = chunk.slice(i);
      const maybe4 = rest.slice(0, 4);
      const maybe3 = rest.slice(0, 3);

      if (esc4.has(maybe4)) {
        tokens.push(maybe4);
        i += 4;
        continue;
      }

      if (esc3.has(maybe3)) {
        tokens.push(maybe3);
        i += 3;
        continue;
      }

      if (rest.startsWith("\x1b")) {
        tokens.push("\x1b");
        i += 1;
        continue;
      }

      // Handle multi-byte UTF-8 characters
      const char = rest[0];
      const code = char.charCodeAt(0);
      let charLen = 1;
      if (code >= 0xc0 && code < 0xe0) charLen = 2;
      else if (code >= 0xe0 && code < 0xf0) charLen = 3;
      else if (code >= 0xf0) charLen = 4;
      
      tokens.push(rest.slice(0, charLen));
      i += charLen;
    }

    return tokens;
  }

  private handleInput(input: string): void {
    const code = input.charCodeAt(0);
    if (code === 3) {
      this.quit();
      return;
    }

    const mode = getState().mode;
    if (mode === "search") {
      this.handleSearchInput(input);
      return;
    }
    if (mode === "modal") {
      this.handleModalInput(input);
      return;
    }

    this.handleReadingInput(input);
  }

  private handleReadingInput(input: string): void {
    const state = getState();
    const focusSidebar = state.focus === "sidebar";

    switch (input) {
      case "\x1b":
        if (this.copyAnchorVerseIndex !== null) {
          this.clearCopySelection();
        }
        return;
      case "q":
      case "Q":
        this.quit();
        return;
      case "\t":
        setState({ focus: focusSidebar ? "reader" : "sidebar" });
        return;
      case "\x1b[A":
      case "k":
        focusSidebar ? this.previousBook() : this.moveVerse(-1);
        return;
      case "\x1b[B":
      case "j":
        focusSidebar ? this.nextBook() : this.moveVerse(1);
        return;
      case "\x1b[C":
        focusSidebar ? this.nextChapter() : this.nextChapter();
        return;
      case "\x1b[D":
        focusSidebar ? this.previousChapter() : this.previousChapter();
        return;
      case "\x1b[5~":
        this.moveVerse(-10);
        return;
      case "\x1b[6~":
        this.moveVerse(10);
        return;
      case "[":
        this.previousBook();
        return;
      case "]":
        this.nextBook();
        return;
      case "g":
        this.selectedVerseIndex = 0;
        this.needsRender = true;
        return;
      case "G": {
        const chapter = this.getCurrentChapter();
        if (chapter) this.selectedVerseIndex = Math.max(0, chapter.verses.length - 1);
        this.needsRender = true;
        return;
      }
      case "v":
      case "V":
        this.toggleCopySelection();
        return;
      case "y":
      case "Y":
      case "\r":
        this.copyCurrentPassage();
        return;
      case "/":
        setState({ mode: "search", searchQuery: "" });
        this.searchResults = [];
        this.searchSelectedIndex = 0;
        this.searchOffset = 0;
        this.needsRender = true;
        return;
      case "t":
      case "T":
        this.modalKind = "translation";
        setState({ mode: "modal" });
        this.modalIndex = Math.max(0, this.availableTranslations.indexOf(state.translation));
        this.needsRender = true;
        return;
      case "c":
      case "C":
        this.modalKind = "theme";
        setState({ mode: "modal" });
        this.modalIndex = Math.max(
          0,
          this.themeOptions.findIndex((option) => option.name === state.theme)
        );
        this.needsRender = true;
        return;
      case "?":
      case "h":
      case "H":
        this.modalKind = "help";
        setState({ mode: "modal" });
        this.modalIndex = 0;
        this.needsRender = true;
        return;
      default:
        return;
    }
  }

  private handleSearchInput(input: string): void {
    const state = getState();
    const code = input.charCodeAt(0);

    switch (input) {
      case "\x1b":
        setState({ mode: "reading", searchQuery: "" });
        this.searchResults = [];
        this.searchSelectedIndex = 0;
        this.searchOffset = 0;
        this.needsRender = true;
        return;
      case "\x1b[A":
        this.searchSelectedIndex = Math.max(0, this.searchSelectedIndex - 1);
        this.ensureSearchSelectionVisible();
        this.needsRender = true;
        return;
      case "\x1b[B":
        this.searchSelectedIndex = Math.min(
          Math.max(0, this.searchResults.length - 1),
          this.searchSelectedIndex + 1
        );
        this.ensureSearchSelectionVisible();
        this.needsRender = true;
        return;
      case "\x1b[5~":
        this.searchSelectedIndex = Math.max(0, this.searchSelectedIndex - 8);
        this.ensureSearchSelectionVisible();
        this.needsRender = true;
        return;
      case "\x1b[6~":
        this.searchSelectedIndex = Math.min(
          Math.max(0, this.searchResults.length - 1),
          this.searchSelectedIndex + 8
        );
        this.ensureSearchSelectionVisible();
        this.needsRender = true;
        return;
      case "\r":
        this.acceptSearchSelection();
        this.needsRender = true;
        return;
      default:
        break;
    }

    if (code === 127 || code === 8) {
      const next = state.searchQuery.slice(0, -1);
      setState({ searchQuery: next });
      this.refreshSearch(next);
      return;
    }

    if (code >= 32 && code <= 126) {
      const next = state.searchQuery + input;
      setState({ searchQuery: next });
      this.refreshSearch(next);
    }
  }

  private handleModalInput(input: string): void {
    if (this.modalKind === "help") {
      if (input === "\x1b" || input === "\r" || input === "q") {
        setState({ mode: "reading" });
        this.needsRender = true;
      }
      return;
    }

    switch (input) {
      case "\x1b":
        setState({ mode: "reading" });
        this.needsRender = true;
        return;
      case "\x1b[A":
        this.modalIndex = Math.max(0, this.modalIndex - 1);
        this.needsRender = true;
        return;
      case "\x1b[B":
        this.modalIndex = Math.min(this.getModalOptionCount() - 1, this.modalIndex + 1);
        this.needsRender = true;
        return;
      case "\r": {
        if (this.modalKind === "translation") {
          const selected = this.availableTranslations[this.modalIndex];
          this.loadTranslation(selected);
        } else if (this.modalKind === "theme") {
          const selectedTheme = this.themeOptions[this.modalIndex];
          if (selectedTheme) {
            setState({ theme: selectedTheme.name });
            this.flash(`Theme: ${selectedTheme.label}`);
          }
        }
        setState({ mode: "reading" });
        this.needsRender = true;
        return;
      }
      default:
        return;
    }
  }

  private getModalOptionCount(): number {
    if (this.modalKind === "translation") return this.availableTranslations.length;
    if (this.modalKind === "theme") return this.themeOptions.length;
    return 1;
  }

  private refreshSearch(query: string): void {
    this.searchResults = search(query, 120);
    this.searchSelectedIndex = 0;
    this.searchOffset = 0;
    this.needsRender = true;
  }

  private ensureSearchSelectionVisible(): void {
    const visibleRows = Math.max(1, this.termHeight - 9);
    if (this.searchSelectedIndex < this.searchOffset) {
      this.searchOffset = this.searchSelectedIndex;
    } else if (this.searchSelectedIndex >= this.searchOffset + visibleRows) {
      this.searchOffset = this.searchSelectedIndex - visibleRows + 1;
    }
  }

  private acceptSearchSelection(): void {
    const selected = this.searchResults[this.searchSelectedIndex];
    if (selected) {
      this.jumpToReference({
        bookSlug: selected.bookSlug,
        chapter: selected.chapter,
        verse: selected.verse,
      });
      this.flash(`Jumped to ${selected.book} ${selected.chapter}:${selected.verse}`);
      return;
    }

    const state = getState();
    const parsed = this.bible ? parseReferenceInput(state.searchQuery, this.bible.books) : null;
    if (parsed) {
      this.jumpToReference(parsed);
      this.flash("Jumped by reference");
      return;
    }

    this.flash("No match selected");
  }

  private jumpToReference(ref: ParsedReference): void {
    if (!this.bible) return;
    const book = this.bible.books.find((b) => b.slug === ref.bookSlug);
    if (!book) return;

    const chapter = Math.min(Math.max(1, ref.chapter), book.chapters.length);

    setState({
      mode: "reading",
      currentBook: book.slug,
      currentChapter: chapter,
      searchQuery: "",
    });

    if (ref.verse && Number.isFinite(ref.verse)) {
      this.selectedVerseIndex = Math.max(0, ref.verse - 1);
    } else {
      this.selectedVerseIndex = 0;
    }
    this.readerStartVerse = Math.max(0, this.selectedVerseIndex - 2);
    this.copyAnchorVerseIndex = null;

    this.searchResults = [];
    this.searchSelectedIndex = 0;
    this.searchOffset = 0;
    this.clampVerseIndex();
    this.needsRender = true;
  }

  private moveVerse(delta: number): void {
    const chapter = this.getCurrentChapter();
    if (!chapter) return;
    this.selectedVerseIndex = Math.min(
      Math.max(0, this.selectedVerseIndex + delta),
      Math.max(0, chapter.verses.length - 1)
    );
    this.needsRender = true;
  }

  private nextChapter(): void {
    const book = this.getCurrentBook();
    const state = getState();
    if (!book) return;

    if (state.currentChapter < book.chapters.length) {
      setState({ currentChapter: state.currentChapter + 1 });
      this.selectedVerseIndex = 0;
      this.copyAnchorVerseIndex = null;
      this.needsRender = true;
      return;
    }

    this.nextBook();
  }

  private previousChapter(): void {
    const state = getState();
    if (state.currentChapter > 1) {
      setState({ currentChapter: state.currentChapter - 1 });
      this.selectedVerseIndex = 0;
      this.copyAnchorVerseIndex = null;
      this.needsRender = true;
      return;
    }

    if (!this.bible) return;
    const index = this.getCurrentBookIndex();
    if (index <= 0) return;
    const previousBook = this.bible.books[index - 1];
    setState({
      currentBook: previousBook.slug,
      currentChapter: previousBook.chapters.length,
    });
    this.selectedVerseIndex = 0;
    this.copyAnchorVerseIndex = null;
    this.needsRender = true;
  }

  private nextBook(): void {
    if (!this.bible) return;
    const index = this.getCurrentBookIndex();
    if (index < 0 || index >= this.bible.books.length - 1) return;
    setState({
      currentBook: this.bible.books[index + 1].slug,
      currentChapter: 1,
    });
    this.selectedVerseIndex = 0;
    this.copyAnchorVerseIndex = null;
    this.needsRender = true;
  }

  private previousBook(): void {
    if (!this.bible) return;
    const index = this.getCurrentBookIndex();
    if (index <= 0) return;
    setState({
      currentBook: this.bible.books[index - 1].slug,
      currentChapter: 1,
    });
    this.selectedVerseIndex = 0;
    this.copyAnchorVerseIndex = null;
    this.needsRender = true;
  }

  private toggleCopySelection(): void {
    if (this.copyAnchorVerseIndex === this.selectedVerseIndex) {
      this.clearCopySelection();
      return;
    }

    this.copyAnchorVerseIndex = this.selectedVerseIndex;
    this.flash(`Selection start: verse ${this.selectedVerseIndex + 1}`);
  }

  private clearCopySelection(): void {
    if (this.copyAnchorVerseIndex === null) return;
    this.copyAnchorVerseIndex = null;
    this.flash("Selection cleared");
  }

  private copyCurrentPassage(): void {
    const book = this.getCurrentBook();
    const chapter = this.getCurrentChapter();
    if (!book || !chapter) return;

    const range = getVerseSelectionRange(this.selectedVerseIndex, this.copyAnchorVerseIndex);
    const verses = chapter.verses.slice(range.start, range.end + 1);
    if (verses.length === 0) return;

    const translation = getState().translation;
    const { citation, payload } = buildCopyPayload({
      bookName: book.name,
      chapter: chapter.chapter,
      translation,
      verses,
    });

    try {
      Bun.spawnSync(["pbcopy"], { stdin: Buffer.from(payload) });
      this.flash(`Copied ${citation}`);
    } catch {
      this.flash("Clipboard unavailable");
    }
  }

  private flash(message: string): void {
    this.statusMessage = message;
    this.statusUntil = Date.now() + 2000;
    this.needsRender = true;
  }

  private render(): void {
    if (!this.bible) return;
    this.clampVerseIndex();

    const state = getState();
    const book = this.getCurrentBook();
    const chapter = this.getCurrentChapter();

    let out = CLEAR;
    const header = this.renderHeader(book, chapter, state.translation);
    out += header.text;

    const bodyHeight = Math.max(8, this.termHeight - header.lineCount - 1);
    if (state.mode === "reading") {
      out += this.renderReadingBody(bodyHeight);
    } else if (state.mode === "search") {
      out += this.renderSearchBody(bodyHeight);
    } else {
      out += this.renderModalBody(bodyHeight);
    }

    out += this.renderStatusLine();
    process.stdout.write(out);
  }

  private renderHeader(
    book: Book | null,
    chapter: Chapter | null,
    translation: string
  ): HeaderRender {
    const theme = this.getTheme();
    const separator = `${DIM}${"-".repeat(this.termWidth)}${RESET}`;
    const bookName = book?.name ?? "-";
    const chapterLabel = chapter ? `${chapter.chapter}` : "-";
    const brand = `${theme.bgSubtle}${theme.textBright}${BOLD} ${FALLBACK_WORDMARK} ${RESET}`;
    const location = `${theme.accentBright}${BOLD}${bookName} ${chapterLabel}${RESET}`;
    const controls = `${theme.warm}[t]${RESET}${DIM} translation${RESET}  ${theme.warm}[c]${RESET}${DIM} theme${RESET}`;
    const left = `${brand} ${location}`;
    const spaces = Math.max(
      2,
      this.termWidth - this.visibleLength(left) - this.visibleLength(controls)
    );
    const topLine = `${left}${" ".repeat(spaces)}${controls}`;

    const contextLine = this.buildHeaderContextLine(book, chapter, translation, this.termWidth);
    return {
      lineCount: 3,
      text: `${topLine}\n${contextLine}\n${separator}\n`,
    };
  }

  private buildHeaderContextLine(
    book: Book | null,
    chapter: Chapter | null,
    translation: string,
    width: number
  ): string {
    const theme = this.getTheme();
    const verse = chapter?.verses[this.selectedVerseIndex];
    const relatedLimit = width >= 110 ? 4 : width >= 84 ? 3 : 2;
    const related = book && chapter && verse
      ? findRelatedVerses(
          verse.text,
          {
            bookSlug: book.slug,
            chapter: chapter.chapter,
            verse: verse.verse,
          },
          relatedLimit
        ).map((result) => this.formatHeaderReference(result))
      : [];
    const selectedRef = book && chapter && verse
      ? `${theme.bgSubtle}${theme.textBright} ${book.name} ${chapter.chapter}:${verse.verse} ${RESET}`
      : `${theme.bgSubtle}${DIM} No verse selected ${RESET}`;
    const translationChip = `${theme.bgSubtle}${theme.accentBright} ${translation} ${RESET}`;
    const prefix = `${selectedRef} ${translationChip} `;
    const available = Math.max(10, width - this.visibleLength(prefix));
    const refs = this.buildHeaderTokenLine(
      "CROSSREFS",
      related,
      available,
      theme.accentBright,
      "No strong links"
    );
    return `${prefix}${refs}`;
  }

  private buildHeaderTokenLine(
    label: string,
    tokens: string[],
    width: number,
    tokenColor: string,
    emptyState: string
  ): string {
    const theme = this.getTheme();
    const labelText = `${label} `;
    const maxContentWidth = Math.max(0, width - labelText.length);
    const chosen: string[] = [];
    let used = 0;

    for (const token of tokens) {
      const nextWidth = used + (chosen.length > 0 ? 2 : 0) + token.length;
      if (nextWidth > maxContentWidth) break;
      chosen.push(token);
      used = nextWidth;
    }

    const body = chosen.length > 0
      ? chosen
          .map((token) => `${tokenColor}${token}${RESET}`)
          .join(`${DIM}  ${RESET}`)
      : `${DIM}${this.truncate(emptyState, maxContentWidth)}${RESET}`;

    return `${theme.warm}${BOLD}${label}${RESET} ${body}`;
  }

  private formatHeaderReference(result: SearchResult): string {
    const abbreviation = this.bible?.books.find((entry) => entry.slug === result.bookSlug)?.abbreviation;
    const label = (abbreviation ?? result.book.slice(0, 3)).toUpperCase();
    return `${label} ${result.chapter}:${result.verse}`;
  }

  private renderReadingBody(bodyHeight: number): string {
    if (this.termWidth < 72) {
      const compact = this.buildReaderLines(bodyHeight, Math.max(18, this.termWidth - 2));
      return `${compact.join("\n")}\n`;
    }

    const sidebarWidth = Math.max(23, Math.min(30, Math.floor(this.termWidth * 0.28)));
    const readerWidth = Math.max(28, this.termWidth - sidebarWidth - 2);

    const sidebarLines = this.buildSidebarLines(bodyHeight, sidebarWidth);
    const readerLines = this.buildReaderLines(bodyHeight, readerWidth);

    const lines: string[] = [];
    for (let i = 0; i < bodyHeight; i++) {
      const left = this.padAnsi(sidebarLines[i] ?? "", sidebarWidth);
      lines.push(`${left}  ${readerLines[i] ?? ""}`);
    }

    return `${lines.join("\n")}\n`;
  }

  private buildSidebarLines(height: number, width: number): string[] {
    if (!this.bible) return [];

    const theme = this.getTheme();
    const state = getState();
    const currentBook = this.getCurrentBook();
    const currentBookIndex = this.getCurrentBookIndex();

    const lines: string[] = [];
    const focused = state.focus === "sidebar" ? `${theme.bgSubtle}${theme.textBright}` : "";
    const totalBooks = this.bible.books.length;
    lines.push(
      `${focused}${BOLD}${theme.textBright} BOOKS ${RESET}${DIM} ${totalBooks} total${RESET}`
    );

    const chapterCount = currentBook?.chapters.length ?? 0;
    lines.push(
      `${theme.accentBright}${this.truncate(currentBook?.name ?? "-", width - 10)}${RESET}${DIM}  ${state.currentChapter}/${chapterCount}${RESET}`
    );
    lines.push("");

    const maxBooks = Math.max(1, height - 6);
    let start = Math.max(0, currentBookIndex - Math.floor(maxBooks / 2));
    let end = Math.min(this.bible.books.length, start + maxBooks);
    if (end - start < maxBooks) start = Math.max(0, end - maxBooks);

    for (let i = start; i < end; i++) {
      const book = this.bible.books[i];
      const selected = i === currentBookIndex;
      const marker = selected ? ">" : " ";
      const name = this.truncate(book.name, width - 6);
      if (selected) {
        const raw = `> ${name}`;
        const pad = " ".repeat(Math.max(0, width - raw.length));
        lines.push(`${theme.bgSubtle}${theme.accent}${BOLD}> ${theme.textBright}${name}${pad}${RESET}`);
      } else {
        lines.push(`${DIM}${marker}${RESET} ${theme.text}${name}${RESET}`);
      }
    }

    lines.push("");
    lines.push(`${DIM}[Tab] toggle focus${RESET}`);

    while (lines.length < height) lines.push("");
    return lines.slice(0, height);
  }

  private buildReaderLines(height: number, width: number): string[] {
    const chapter = this.getCurrentChapter();
    const book = this.getCurrentBook();
    if (!chapter || !book) return ["No chapter loaded"];

    const theme = this.getTheme();
    const lines: string[] = [];
    const selectedLabel = `${this.selectedVerseIndex + 1}/${chapter.verses.length}`;
    const selectionLabel = this.getSelectionLabel(chapter);
    const title = `${theme.accentBright}${BOLD}${book.name} ${chapter.chapter}${RESET}`;
    const verseChip = `${theme.bgSubtle}${theme.textBright} verse ${selectedLabel} ${RESET}`;
    const selectionChip = selectionLabel
      ? ` ${theme.bgSubtle}${theme.warm} ${selectionLabel} ${RESET}`
      : "";
    lines.push(
      `${title}  ${verseChip}${selectionChip}${DIM}  PgUp/PgDn jump 10${RESET}`
    );

    const usable = Math.max(1, height - 1);
    const contentWidth = Math.max(8, Math.min(width - 10, 512));
    this.updateReaderStartVerse(chapter, contentWidth, usable);
    const startVerse = this.readerStartVerse;

    for (let i = startVerse; i < chapter.verses.length; i++) {
      if (lines.length >= height) break;
      const verse = chapter.verses[i];
      const selected = i === this.selectedVerseIndex;
      const inSelection = isVerseWithinSelection(
        i,
        this.selectedVerseIndex,
        this.copyAnchorVerseIndex
      );
      const red = isRedLetter(book.slug, chapter.chapter, verse.verse);
      const verseNo = `${String(verse.verse).padStart(3, " ")}`;
      const wrapped = this.wrapText(verse.text, contentWidth);

      const prefix = selected
        ? `${theme.accentBright}${BOLD}>${RESET}`
        : inSelection
          ? `${theme.accent}+${RESET}`
          : " ";
      const rowBg = selected ? theme.bgActive : "";
      const verseNoStyle = selected
        ? `${rowBg}${theme.warm}${BOLD}`
        : inSelection
          ? `${theme.accent}${BOLD}`
          : DIM;
      const paragraphChar = verse.paragraphStart ? "¶" : " ";
      const paragraphMarker = selected
        ? `${rowBg}${DIM}${paragraphChar}${RESET}`
        : verse.paragraphStart
          ? `${DIM}${paragraphChar}${RESET}`
          : " ";
      const textStyle = `${rowBg}${selected ? BOLD : ""}${red ? theme.redLetter : theme.textBright}`;

      if (wrapped.length > 0) {
        lines.push(
          `${prefix}  ${verseNoStyle}${verseNo}${RESET} ${paragraphMarker} ${textStyle}${wrapped[0]}${RESET}`
        );
      }

      for (let w = 1; w < wrapped.length; w++) {
        if (lines.length >= height) break;
        const continuationPrefix = selected
          ? `${theme.accent}${BOLD}:${RESET}`
          : inSelection
            ? `${theme.accent}:${RESET}`
            : " ";
        lines.push(`${continuationPrefix}        ${textStyle}${wrapped[w]}${RESET}`);
      }
    }

    while (lines.length < height) lines.push("");
    return lines.slice(0, height);
  }

  private getSelectionLabel(chapter: Chapter): string {
    if (this.copyAnchorVerseIndex === null) return "";

    const range = getVerseSelectionRange(this.selectedVerseIndex, this.copyAnchorVerseIndex);
    const firstVerse = chapter.verses[range.start];
    const lastVerse = chapter.verses[range.end];
    if (!firstVerse || !lastVerse) return "";

    if (firstVerse.verse === lastVerse.verse) {
      return `Mark ${firstVerse.verse}`;
    }

    return `Copy ${firstVerse.verse}-${lastVerse.verse}`;
  }

  private estimateVerseLineCount(text: string, contentWidth: number): number {
    return Math.max(1, this.wrapText(text, contentWidth).length);
  }

  private calculateReaderStartVerse(
    chapter: Chapter,
    contentWidth: number,
    availableLines: number
  ): number {
    // Keep the selected verse visible even when verse text wraps into many lines.
    // First, move start forward until selected fits. Then pull back for context.
    const maxVerseIndex = Math.max(0, chapter.verses.length - 1);
    const selected = Math.min(Math.max(0, this.selectedVerseIndex), maxVerseIndex);

    let start = Math.min(this.readerStartVerse, selected);
    if (selected < start) start = selected;

    const linesToSelected = (from: number): number => {
      let total = 0;
      for (let i = from; i <= selected; i++) {
        total += this.estimateVerseLineCount(chapter.verses[i].text, contentWidth);
      }
      return total;
    };

    while (start < selected && linesToSelected(start) > availableLines) {
      start += 1;
    }

    const contextBudget = Math.max(0, availableLines - 3);
    while (start > 0) {
      const candidate = start - 1;
      if (linesToSelected(candidate) > contextBudget) break;
      start = candidate;
    }

    return start;
  }

  private updateReaderStartVerse(chapter: Chapter, contentWidth: number, availableLines: number): void {
    this.readerStartVerse = this.calculateReaderStartVerse(chapter, contentWidth, availableLines);
  }

  private renderSearchBody(bodyHeight: number): string {
    const theme = this.getTheme();
    const state = getState();
    const terms = getSearchTerms(state.searchQuery);
    const lines: string[] = [];

    const summary = `${this.searchResults.length} results`;
    lines.push(`${BOLD} Search ${RESET} ${DIM}${summary}${RESET}`);
    lines.push(`/${state.searchQuery}_`);
    lines.push(`${DIM} Tip: type a reference like "john 3:16" and press Enter${RESET}`);
    lines.push("");

    const visibleRows = Math.max(1, bodyHeight - lines.length);
    const start = this.searchOffset;
    const end = Math.min(this.searchResults.length, start + visibleRows);

    if (this.searchResults.length === 0 && state.searchQuery.trim().length >= 2) {
      lines.push(`${DIM}No text matches. Press Enter for reference jump.${RESET}`);
    }

    for (let i = start; i < end; i++) {
      const r = this.searchResults[i];
      const selected = i === this.searchSelectedIndex;
      const marker = selected ? `${theme.accent}>${RESET}` : " ";
      const ref = `${r.book} ${r.chapter}:${r.verse}`;
      const available = Math.max(10, this.termWidth - this.visibleLength(ref) - 12);
      const snippet = this.highlightTerms(this.truncate(r.text, available), terms);
      const scoreTag = `${DIM}${String(r.score).padStart(3, " ")}${RESET}`;
      const row = `${marker} ${theme.warm}${ref}${RESET} ${snippet} ${scoreTag}`;
      lines.push(selected ? `${BOLD}${row}${RESET}` : row);
    }

    while (lines.length < bodyHeight) lines.push("");
    return `${lines.join("\n")}\n`;
  }

  private highlightTerms(text: string, terms: string[]): string {
    const theme = this.getTheme();
    if (terms.length === 0) return text;
    let out = text;
    const unique = Array.from(new Set(terms.filter((term) => term.length >= 2))).slice(0, 6);
    unique.sort((a, b) => b.length - a.length);

    for (const term of unique) {
      if (term.length < 2) continue;
      const safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${safe})`, "gi");
      out = out.replace(regex, `${theme.warm}$1${RESET}`);
    }
    return out;
  }

  private renderModalBody(bodyHeight: number): string {
    if (this.modalKind === "help") return this.renderHelpBody(bodyHeight);
    if (this.modalKind === "theme") return this.renderThemeBody(bodyHeight);

    const theme = this.getTheme();
    const lines: string[] = [];
    lines.push(`${BOLD}${theme.textBright} Select Translation ${RESET}`);
    lines.push("");

    for (let i = 0; i < this.availableTranslations.length; i++) {
      const t = this.availableTranslations[i];
      const selected = i === this.modalIndex;
      const marker = selected ? `${theme.accent}>${RESET}` : " ";
      const row = `${marker} ${t}`;
      lines.push(selected ? `${BOLD}${row}${RESET}` : row);
    }

    lines.push("");
    lines.push(`${DIM}Up/Down choose  Enter apply  Esc cancel${RESET}`);
    while (lines.length < bodyHeight) lines.push("");
    return `${lines.join("\n")}\n`;
  }

  private renderThemeBody(bodyHeight: number): string {
    const theme = this.getTheme();
    const lines: string[] = [];
    lines.push(`${BOLD}${theme.textBright} Select Theme ${RESET}`);
    lines.push("");

    for (let i = 0; i < this.themeOptions.length; i++) {
      const option = this.themeOptions[i];
      const selected = i === this.modalIndex;
      const active = option.name === getState().theme ? `${DIM} current${RESET}` : "";
      const marker = selected ? `${theme.accent}>${RESET}` : " ";
      const row = `${marker} ${option.label}${active ? `  ${active}` : ""}`;
      lines.push(selected ? `${BOLD}${row}${RESET}` : row);
    }

    lines.push("");
    lines.push(`${DIM}Up/Down choose  Enter apply  Esc cancel${RESET}`);
    while (lines.length < bodyHeight) lines.push("");
    return `${lines.join("\n")}\n`;
  }

  private renderHelpBody(bodyHeight: number): string {
    const theme = this.getTheme();
    const lines: string[] = [];
    lines.push(`${BOLD}${theme.textBright} Help ${RESET}`);
    lines.push("");
    lines.push("Navigation:");
    lines.push("  Up/Down    move verse (or book when sidebar focused)");
    lines.push("  Left/Right previous/next chapter");
    lines.push("  [ and ]    previous/next book");
    lines.push("  PgUp/PgDn  jump 10 verses");
    lines.push("  g / G      top / bottom of chapter");
    lines.push("");
    lines.push("Actions:");
    lines.push("  /          search text or reference (john 3:16)");
    lines.push("  t          translation picker");
    lines.push("  c          color theme picker");
    lines.push("  v          mark range start (move, then y to copy multiple verses)");
    lines.push("  y / Enter  copy current verse or marked range");
    lines.push("  Tab        toggle sidebar focus");
    lines.push("  Esc        clear marked range");
    lines.push("  q          quit");
    lines.push("");
    lines.push(`${DIM}Press Esc, Enter, or q to close help${RESET}`);

    while (lines.length < bodyHeight) lines.push("");
    return `${lines.slice(0, bodyHeight).join("\n")}\n`;
  }

  private renderStatusLine(): string {
    const theme = this.getTheme();
    const state = getState();
    const hints: Record<string, string> = {
      reading:
        "Move jk/arrows  Mark v  Copy Enter/y  Search /  Translate t  Theme c  Help ?  Quit q",
      search: "Type to search  Up/Down select  Enter open  Esc close",
      modal: this.modalKind === "help"
        ? "Esc or Enter closes help"
        : "Up/Down choose  Enter apply  Esc cancel",
    };

    const active = Date.now() < this.statusUntil ? this.statusMessage : hints[state.mode];
    const modeTag = `${theme.accent}${state.mode.toUpperCase()}${RESET}`;
    const message = this.truncate(`${modeTag}  ${active}`, this.termWidth);
    return `${DIM}${message}${RESET}`;
  }

  private truncate(text: string, width: number): string {
    if (width <= 0) return "";
    if (this.visibleLength(text) <= width) return text;
    if (width <= 3) return text.slice(0, width);
    return text.slice(0, width - 3) + "...";
  }

  private wrapText(text: string, width: number): string[] {
    if (width <= 0) return [text];
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [""];

    const lines: string[] = [];
    let current = "";

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length <= width) {
        current = next;
      } else {
        if (current) lines.push(current);
        if (word.length > width) {
          let offset = 0;
          while (offset < word.length) {
            lines.push(word.slice(offset, offset + width));
            offset += width;
          }
          current = "";
        } else {
          current = word;
        }
      }
    }

    if (current) lines.push(current);
    return lines;
  }

  private visibleLength(s: string): number {
    let length = 0;
    let inEscape = false;

    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === ESC) {
        inEscape = true;
        continue;
      }

      if (inEscape) {
        if (ch === "m") inEscape = false;
        continue;
      }

      length += 1;
    }

    return length;
  }

  private padAnsi(s: string, width: number): string {
    const len = this.visibleLength(s);
    if (len >= width) return s;
    return s + " ".repeat(width - len);
  }

  private padAnsiLeft(s: string, width: number): string {
    const len = this.visibleLength(s);
    if (len >= width) return s;
    return " ".repeat(width - len) + s;
  }

  private quit(): void {
    this.running = false;
  }

  private cleanupAndExit(code: number = 0, errorMessage?: string): void {
    // Idempotent cleanup avoids broken terminals on repeated error paths.
    if (this.cleanedUp) {
      process.exit(code);
      return;
    }

    this.cleanedUp = true;

    try {
      if (process.stdin.isTTY && typeof process.stdin.setRawMode === "function") {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      process.stdout.write(`${RESET}${ESC}[?25h${ALT_SCREEN_OFF}`);
      if (errorMessage) {
        process.stderr.write(`${errorMessage}\n`);
      }
    } finally {
      process.exit(code);
    }
  }
}

function printHelp(): void {
  const banner = getCliBanner();
  if (banner) {
    console.log(banner);
  } else {
    console.log("bterm - Terminal Bible reader");
  }
  console.log("");
  console.log("Usage:");
  console.log("  bterm");
  console.log("  bterm upgrade");
  console.log("  bterm --help");
  console.log("  bterm --version");
  console.log("  bterm --doctor");
  console.log("");
  console.log("Reader keys: arrows/jk move, v mark, Enter or y copy, Esc clear, / search, t translation, c theme, ? help, q quit");
}

function runDoctor(): void {
  const installed = getInstalledTranslations();
  const healthy = getAvailableTranslations();
  console.log(`bterm ${VERSION}`);
  console.log(`installed: ${installed.join(", ") || "none"}`);

  if (installed.length === 0) {
    console.log("healthy: none");
    console.log("status: error (no installed translations)");
    process.exit(1);
  }

  let allHealthy = true;
  for (const translation of installed) {
    const health = inspectTranslation(translation, { allowInvalid: true });
    if (!health.installed) {
      allHealthy = false;
      console.log(`${translation}: missing`);
      continue;
    }

    const stats = health.stats;
    const summary = `${stats?.totalBooks ?? 0} books, ${stats?.totalChapters ?? 0} chapters, ${stats?.totalVerses ?? 0} verses`;
    if (health.healthy) {
      console.log(`${translation}: ok (${summary})`);
    } else {
      allHealthy = false;
      console.log(`${translation}: invalid (${summary}; ${health.warningCount} warnings)`);
    }
  }

  console.log(`healthy: ${healthy.join(", ") || "none"}`);
  console.log(`status: ${allHealthy && healthy.length > 0 ? "ok" : "error"}`);
  process.exit(allHealthy && healthy.length > 0 ? 0 : 1);
}

function getCliBanner(): string {
  if (!process.stdout.isTTY) {
    return "";
  }

  return renderSplashBanner(process.stdout.columns || 0, process.stdout.rows || 0);
}

function getHealthyDataMissingMessage(): string {
  return process.env.BTERM_INSTALL_MODE === "installed"
    ? `No healthy Bible data found. Run: ${DEFAULT_UPGRADE_COMMAND}`
    : "No healthy Bible data found. Run: bun run download && bun run install";
}

async function runUpgradeCommand(args: string[]): Promise<void> {
  const banner = getCliBanner();
  if (banner) {
    console.log(banner);
  } else {
    console.log("bterm upgrade");
  }

  const result = await runUpgrade({
    checkOnly: args.includes("--check"),
    force: args.includes("--force"),
    logger: (message) => console.log(message),
  });
  console.log(result.message);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args[0] === "upgrade") {
    try {
      await runUpgradeCommand(args.slice(1));
      process.exit(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exit(1);
    }
  }

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  if (args.includes("--version") || args.includes("-v")) {
    console.log(VERSION);
    process.exit(0);
  }

  if (args.includes("--doctor")) {
    runDoctor();
    process.exit(0);
  }

  await new BibleTerm().init();
}

await main();

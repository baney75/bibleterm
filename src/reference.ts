import type { Book } from "./data/loader";

export type ParsedReference = {
  bookSlug: string;
  chapter: number;
  verse?: number;
};

const ALIASES: Record<string, string> = {
  gen: "genesis",
  ex: "exodus",
  lev: "leviticus",
  num: "numbers",
  deut: "deuteronomy",
  deu: "deuteronomy",
  josh: "joshua",
  jdg: "judges",
  judg: "judges",
  ps: "psalms",
  psa: "psalms",
  prov: "proverbs",
  eccl: "ecclesiastes",
  song: "song-of-solomon",
  sos: "song-of-solomon",
  songofsongs: "song-of-solomon",
  canticles: "song-of-solomon",
  isa: "isaiah",
  jer: "jeremiah",
  lam: "lamentations",
  ezek: "ezekiel",
  dan: "daniel",
  hos: "hosea",
  amo: "amos",
  obad: "obadiah",
  jon: "jonah",
  mic: "micah",
  nah: "nahum",
  hab: "habakkuk",
  zeph: "zephaniah",
  hag: "haggai",
  zech: "zechariah",
  mal: "malachi",
  matt: "matthew",
  mt: "matthew",
  mrk: "mark",
  mk: "mark",
  luk: "luke",
  lk: "luke",
  jn: "john",
  jhn: "john",
  rom: "romans",
  "1cor": "1corinthians",
  "2cor": "2corinthians",
  gal: "galatians",
  eph: "ephesians",
  phil: "philippians",
  col: "colossians",
  "1thess": "1thessalonians",
  "2thess": "2thessalonians",
  "1tim": "1timothy",
  "2tim": "2timothy",
  phlm: "philemon",
  heb: "hebrews",
  jas: "james",
  jam: "james",
  "1pet": "1peter",
  "2pet": "2peter",
  "1jn": "1john",
  "2jn": "2john",
  "3jn": "3john",
  rev: "revelation",
};

function compact(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function parseReferenceInput(raw: string, books: Book[]): ParsedReference | null {
  const text = raw.toLowerCase().trim();
  if (!text) return null;

  const match = text.match(/^(.+?)\s*(\d+)(?::(\d+))?$/);
  if (!match) return null;

  let bookPart = match[1].replace(/[^a-z0-9\s.-]/g, "").replace(/\s+/g, " ").trim();
  const chapter = parseInt(match[2], 10);
  const verse = match[3] ? parseInt(match[3], 10) : undefined;
  if (!Number.isFinite(chapter) || chapter < 1) return null;

  const compactBook = compact(bookPart);
  const aliasSlug = ALIASES[compactBook];
  if (aliasSlug) {
    bookPart = aliasSlug;
  }

  const wanted = compact(aliasSlug ?? bookPart);

  const candidates = books.map((b) => ({
    slug: b.slug,
    slugCompact: compact(b.slug),
    nameCompact: compact(b.name),
  }));

  let found = candidates.find((c) => c.slugCompact === wanted);
  if (!found) found = candidates.find((c) => c.nameCompact === wanted);
  if (!found) found = candidates.find((c) => c.nameCompact.startsWith(wanted));
  if (!found) found = candidates.find((c) => c.slugCompact.startsWith(wanted));

  if (!found) return null;

  return {
    bookSlug: found.slug,
    chapter,
    verse,
  };
}

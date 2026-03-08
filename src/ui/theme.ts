const ESC = "\x1b";

export type ThemeName = "midnight" | "sandstone" | "forest";

export interface ThemePalette {
  name: ThemeName;
  label: string;
  accent: string;
  accentBright: string;
  warm: string;
  text: string;
  textBright: string;
  redLetter: string;
  bgSubtle: string;
  bgActive: string;
}

const THEMES: Record<ThemeName, ThemePalette> = {
  midnight: {
    name: "midnight",
    label: "Midnight",
    accent: `${ESC}[36m`,
    accentBright: `${ESC}[96m`,
    warm: `${ESC}[93m`,
    text: `${ESC}[37m`,
    textBright: `${ESC}[97m`,
    redLetter: `${ESC}[91m`,
    bgSubtle: `${ESC}[48;5;236m`,
    bgActive: `${ESC}[48;5;238m`,
  },
  sandstone: {
    name: "sandstone",
    label: "Sandstone",
    accent: `${ESC}[38;5;180m`,
    accentBright: `${ESC}[38;5;223m`,
    warm: `${ESC}[38;5;215m`,
    text: `${ESC}[38;5;252m`,
    textBright: `${ESC}[97m`,
    redLetter: `${ESC}[38;5;203m`,
    bgSubtle: `${ESC}[48;5;239m`,
    bgActive: `${ESC}[48;5;240m`,
  },
  forest: {
    name: "forest",
    label: "Forest",
    accent: `${ESC}[38;5;114m`,
    accentBright: `${ESC}[38;5;157m`,
    warm: `${ESC}[38;5;186m`,
    text: `${ESC}[38;5;252m`,
    textBright: `${ESC}[97m`,
    redLetter: `${ESC}[38;5;210m`,
    bgSubtle: `${ESC}[48;5;22m`,
    bgActive: `${ESC}[48;5;29m`,
  },
};

export const DEFAULT_THEME: ThemeName = "midnight";
export const THEME_ORDER: ThemeName[] = ["midnight", "sandstone", "forest"];

export function getTheme(name: ThemeName): ThemePalette {
  return THEMES[name];
}

export function getThemeOptions(): Array<{ name: ThemeName; label: string }> {
  return THEME_ORDER.map((name) => ({ name, label: THEMES[name].label }));
}

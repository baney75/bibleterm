const ESC = "\x1b";

export type ThemeName = "midnight" | "sandstone" | "forest" | "gruvbox" | "dracula" | "tokyonight";

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

  gruvbox: {
    name: "gruvbox",
    label: "Gruvbox",
    accent: `${ESC}[38;5;167m`, // faded red
    accentBright: `${ESC}[38;5;208m`, // orange
    warm: `${ESC}[38;5;214m`, // yellow
    text: `${ESC}[38;5;223m`, // fg
    textBright: `${ESC}[38;5;230m`, // fg0
    redLetter: `${ESC}[38;5;124m`, // red
    bgSubtle: `${ESC}[48;5;237m`, // bg1
    bgActive: `${ESC}[48;5;239m`, // bg3
  },
  dracula: {
    name: "dracula",
    label: "Dracula",
    accent: `${ESC}[38;5;141m`, // purple
    accentBright: `${ESC}[38;5;183m`, // light purple
    warm: `${ESC}[38;5;228m`, // yellow
    text: `${ESC}[38;5;253m`, // fg
    textBright: `${ESC}[97m`, // bright white
    redLetter: `${ESC}[38;5;203m`, // red
    bgSubtle: `${ESC}[48;5;236m`, // comment/bg-light
    bgActive: `${ESC}[48;5;60m`, // selection
  },
  tokyonight: {
    name: "tokyonight",
    label: "Tokyo Night",
    accent: `${ESC}[38;5;111m`, // blue
    accentBright: `${ESC}[38;5;117m`, // light blue
    warm: `${ESC}[38;5;214m`, // orange
    text: `${ESC}[38;5;188m`, // fg
    textBright: `${ESC}[38;5;231m`, // fg dark
    redLetter: `${ESC}[38;5;203m`, // red
    bgSubtle: `${ESC}[48;5;235m`, // bg darker
    bgActive: `${ESC}[48;5;237m`, // bg active
  },
};

export const DEFAULT_THEME: ThemeName = "midnight";
export const THEME_ORDER: ThemeName[] = ["midnight", "sandstone", "forest", "gruvbox", "dracula", "tokyonight"];

export function getTheme(name: ThemeName): ThemePalette {
  return THEMES[name];
}

export function getThemeOptions(): Array<{ name: ThemeName; label: string }> {
  return THEME_ORDER.map((name) => ({ name, label: THEMES[name].label }));
}

/** bibleterm - Global State Management */

import { DEFAULT_THEME, type ThemeName } from "./ui/theme";
import { loadConfig, saveConfig } from "./config";


export type Translation = "ASV" | "KJV" | "WEB" | "YLT";

export const DEFAULT_SHIPPED_TRANSLATIONS: Translation[] = ["ASV", "KJV"];

export type FocusTarget = "sidebar" | "reader";

export type Mode = "reading" | "search" | "modal";

export interface AppState {
  /** Currently selected Bible translation */
  translation: Translation;

  /** Active terminal color theme */
  theme: ThemeName;
  
  /** Currently focused UI element */
  focus: FocusTarget;
  
  /** Current application mode */
  mode: Mode;
  
  /** Currently selected book slug (e.g., "genesis", "john") */
  currentBook: string;
  
  /** Currently selected chapter number (1-indexed) */
  currentChapter: number;
  
  /** Search query string (empty if not searching) */
  searchQuery: string;
  
  /** Whether help modal is open */
  helpOpen: boolean;
  
  /** Sidebar scroll position (for persistence) */
  sidebarScroll: number;
  
  /** Reader scroll position (for persistence) */
  readerScroll: number;
}

const initialConfig = loadConfig();

export const initialState: AppState = {
  translation: "ASV",
  theme: initialConfig.theme,
  focus: "reader",
  mode: "reading",
  currentBook: "genesis",
  currentChapter: 1,
  searchQuery: "",
  helpOpen: false,
  sidebarScroll: 0,
  readerScroll: 0,
};

let state: AppState = { ...initialState };

const listeners: Set<(state: AppState) => void> = new Set();

export function getState(): AppState {
  return { ...state };
}

export function setState(updates: Partial<AppState>): void {
  const oldTheme = state.theme;
  state = { ...state, ...updates };

  if (updates.theme && updates.theme !== oldTheme) {
    saveConfig({ theme: state.theme });
  }

  for (const listener of listeners) {
    listener(state);
  }
}

export function subscribe(listener: (state: AppState) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetState(): void {
  state = { ...initialState };
  for (const listener of listeners) {
    listener(state);
  }
}

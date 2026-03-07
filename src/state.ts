/** bibleterm - Global State Management */

export type Translation = "ASV" | "KJV" | "WEB" | "YLT";

export const DEFAULT_SHIPPED_TRANSLATIONS: Translation[] = ["ASV", "KJV"];

export type FocusTarget = "sidebar" | "reader";

export type Mode = "reading" | "search" | "modal";

export interface AppState {
  /** Currently selected Bible translation */
  translation: Translation;
  
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

export const initialState: AppState = {
  translation: "ASV",
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
  state = { ...state, ...updates };
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

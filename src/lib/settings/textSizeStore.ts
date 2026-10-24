// The DOM attribute is the single source of truth for the current text size (the boot script writes it before
// first paint). This tiny store lets React read and change it through useSyncExternalStore. Beside the size it keeps
// whether this browser keeps it: the last write's answer, or, before any write, what localStorage holds on load.
import {
  DEFAULT_TEXT_SIZE,
  TEXT_SIZE_ATTRIBUTE,
  TEXT_SIZE_STORAGE_KEY,
  parseTextSize,
  writeStoredTextSize,
  type TextSize,
} from './textSize';

const listeners = new Set<() => void>();

/** Whether the size on screen is the one this browser keeps; null until first read (then on load), set by each write. */
let saved: boolean | null = null;

function notify(): void {
  listeners.forEach((l) => l());
}

/** Another tab saved a size, or cleared the store (key null: localStorage.clear()), which reads as the default. */
function onStorage(e: StorageEvent): void {
  if (e.key !== null && e.key !== TEXT_SIZE_STORAGE_KEY) return;
  document.documentElement.setAttribute(TEXT_SIZE_ATTRIBUTE, parseTextSize(e.newValue));
  saved = true; // the other tab's store is this browser's
  notify();
}

export function subscribeTextSize(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
}

export function getTextSizeSnapshot(): TextSize {
  return parseTextSize(document.documentElement.getAttribute(TEXT_SIZE_ATTRIBUTE));
}

export function getTextSizeServerSnapshot(): TextSize {
  return DEFAULT_TEXT_SIZE;
}

/** On load: the stored size is the one on screen (nothing stored means the default), and reading the store did not throw. */
function savedOnLoad(): boolean {
  try {
    const stored = window.localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
    return (stored === null ? DEFAULT_TEXT_SIZE : parseTextSize(stored)) === getTextSizeSnapshot();
  } catch {
    return false;
  }
}

/** Does this browser keep the size on screen? The last write's answer (Display, the shortcuts, another tab), else the load check. */
export function getTextSizeSavedSnapshot(): boolean {
  saved ??= savedOnLoad();
  return saved;
}

export function getTextSizeSavedServerSnapshot(): boolean {
  return true;
}

/** Applies the size for this visit and tries to save it; returns whether the browser kept it (false: blocked or full). */
export function applyTextSize(size: TextSize): boolean {
  document.documentElement.setAttribute(TEXT_SIZE_ATTRIBUTE, size);
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  saved = writeStoredTextSize(storage, size);
  notify();
  return saved;
}

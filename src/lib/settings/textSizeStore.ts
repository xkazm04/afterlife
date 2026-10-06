// The DOM attribute is the single source of truth for the current text size (the boot script writes it before
// first paint). This tiny store lets React read and change it through useSyncExternalStore.
import {
  DEFAULT_TEXT_SIZE,
  TEXT_SIZE_ATTRIBUTE,
  TEXT_SIZE_STORAGE_KEY,
  parseTextSize,
  writeStoredTextSize,
  type TextSize,
} from './textSize';

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((l) => l());
}

function onStorage(e: StorageEvent): void {
  if (e.key !== TEXT_SIZE_STORAGE_KEY) return;
  document.documentElement.setAttribute(TEXT_SIZE_ATTRIBUTE, parseTextSize(e.newValue));
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

export function applyTextSize(size: TextSize): void {
  document.documentElement.setAttribute(TEXT_SIZE_ATTRIBUTE, size);
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  writeStoredTextSize(storage, size);
  notify();
}

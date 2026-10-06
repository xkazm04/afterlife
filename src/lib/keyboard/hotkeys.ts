// Pure key matching for useHotkeys. `mod` means Cmd on macOS or Ctrl elsewhere.

export interface HotkeySpec {
  /** KeyboardEvent.key, compared case-insensitively ("i", "Escape", "/", "ArrowDown"). */
  key: string;
  /** Require Cmd or Ctrl. When false or absent, neither may be held. */
  mod?: boolean;
  /** Require Shift. When absent, Shift is ignored (so "?" works). */
  shift?: boolean;
  alt?: boolean;
}

export interface KeyEventLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export function matchHotkey(e: KeyEventLike, spec: HotkeySpec): boolean {
  if (e.key.toLowerCase() !== spec.key.toLowerCase()) return false;
  if ((e.metaKey || e.ctrlKey) !== !!spec.mod) return false;
  if (e.altKey !== !!spec.alt) return false;
  if (spec.shift !== undefined && e.shiftKey !== spec.shift) return false;
  return true;
}

/** True when the key press targets something the user types into. Single-key shortcuts must not fire there. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !('tagName' in target)) return false;
  const el = target as HTMLElement;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
}

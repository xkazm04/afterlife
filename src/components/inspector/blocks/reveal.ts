// Bidi controls and invisible characters drawn as visible code points ("⟨U+202E⟩"), for every block that shows a
// person exact text before a click: a write's diff and commands, an agent's words. An override or an invisible
// character would otherwise make the text read differently from what it is (Trojan Source, CVE-2021-42574).
// Zero-width (non-)joiners stay: scripts and emoji sequences need them, and they cannot reorder text.
const HIDDEN = /[؜​‎‏‪-‮⁠⁦-⁩﻿]/g;

export function revealControls(text: string): string {
  return text.replace(HIDDEN, (c) => `⟨U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}⟩`);
}

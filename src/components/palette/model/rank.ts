// Ranking palette items against what was typed. Pure: prefix beats word start beats substring beats a scattered
// subsequence; a label match beats a keyword match; screens edge out actions, actions edge out projects.
import type { PaletteItem } from './items';

const KIND_BONUS: Record<PaletteItem['kind'], number> = { screen: 3, action: 2, project: 0 };

/** How well `q` matches `text` (both lower case): 0 for no match. */
export function score(text: string, q: string): number {
  if (!q) return 1;
  if (text.startsWith(q)) return 100 - Math.min(20, text.length - q.length) / 2;
  const at = text.indexOf(q);
  if (at > 0 && /[\s\-_./·]/.test(text[at - 1] ?? '')) return 80;
  if (at > 0) return 60;
  // a subsequence: every typed letter in order; tighter is better
  let i = 0;
  let gaps = 0;
  let last = -1;
  for (let j = 0; j < text.length && i < q.length; j++) {
    if (text[j] === q[i]) {
      if (last >= 0) gaps += j - last - 1;
      last = j;
      i++;
    }
  }
  return i === q.length ? Math.max(1, 40 - gaps) : 0;
}

/**
 * The items for a query, best first, at most `limit`. With nothing typed: the screens and actions only (projects
 * appear as soon as you type, so 184 of them never bury the screens).
 */
export function rank(items: readonly PaletteItem[], query: string, limit = 12): PaletteItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items.filter((i) => i.kind !== 'project').slice(0, limit);
  return items
    .map((it) => {
      const s = Math.max(score(it.label.toLowerCase(), q), it.keywords ? score(it.keywords.toLowerCase(), q) * 0.8 : 0);
      return { it, s: s ? s + KIND_BONUS[it.kind] : 0 };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.it.label.localeCompare(b.it.label))
    .slice(0, limit)
    .map((x) => x.it);
}

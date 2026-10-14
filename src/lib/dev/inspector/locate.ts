// Pure helpers for the DevInspector: walk the DOM for the data-loc stamps the dev loader adds (scripts/dev/source-loc-loader.mjs).

export interface LocEntry {
  el: Element;
  /** Copied reference, clickable in Claude Code: `src/.../File.tsx:88`. */
  loc: string;
  path: string;
}

/** Shared internals: the default copy target skips these and lands on the call site. Alt+right-click still reaches them. */
const LIBRARY_PREFIXES = ['src/components/', 'src/lib/', 'src/styles/'];

export const isLibraryPath = (path: string): boolean => LIBRARY_PREFIXES.some((p) => path.startsWith(p));

export function parseLoc(raw: string): { path: string; loc: string } | null {
  const m = /^(.*):(\d+):\d+$/.exec(raw);
  return m && m[1] && m[2] ? { path: m[1], loc: `${m[1]}:${m[2]}` } : null;
}

/** The stamped elements from `start` up to the root, innermost first. */
export function buildChain(start: Element | null): LocEntry[] {
  const out: LocEntry[] = [];
  let el = start?.closest('[data-loc]') ?? null;
  while (el) {
    const parsed = parseLoc(el.getAttribute('data-loc') ?? '');
    if (parsed) out.push({ el, ...parsed });
    el = el.parentElement?.closest('[data-loc]') ?? null;
  }
  return out;
}

/** First non-library entry (the call site); the innermost when everything is library code. */
export function pickDefaultIndex(chain: LocEntry[]): number {
  const i = chain.findIndex((c) => !isLibraryPath(c.path));
  return i === -1 ? 0 : i;
}

export const dedupeChain = (chain: LocEntry[]): LocEntry[] => chain.filter((c, i) => i === 0 || c.loc !== chain[i - 1]?.loc);

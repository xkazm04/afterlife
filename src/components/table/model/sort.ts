// Pure sorting for outline tables. Rules carried over from the Fleet prototype:
// - clicking a column cycles: default direction -> opposite direction -> back to the initial sort;
// - rows whose value is unknown (null) always sink to the bottom, whatever the direction;
// - ties fall back to a tiebreak comparator (the Fleet uses "attention").

export type SortDir = 1 | -1;
export interface SortState<K extends string = string> {
  key: K;
  dir: SortDir;
}
export type SortValue = string | number | boolean | null | undefined;

export interface SortRules<K extends string> {
  /** First-click direction per column. Default: -1 (largest first). Text columns usually return 1. */
  defaultDir?: (key: K) => SortDir;
  /** What a third click returns to. */
  initial: SortState<K>;
}

/** The state after a click on column `key`. */
export function nextSort<K extends string>(current: SortState<K>, key: K, rules: SortRules<K>): SortState<K> {
  const first = rules.defaultDir?.(key) ?? -1;
  if (current.key !== key) return { key, dir: first };
  if (current.dir === first) return { key, dir: (first * -1) as SortDir };
  return rules.initial;
}

/** aria-sort value for a header. */
export function ariaSort<K extends string>(sort: SortState<K>, key: K): 'ascending' | 'descending' | 'none' {
  if (sort.key !== key) return 'none';
  return sort.dir > 0 ? 'ascending' : 'descending';
}

const isNull = (v: SortValue): v is null | undefined => v === null || v === undefined;
const toComparable = (v: string | number | boolean): string | number => (typeof v === 'boolean' ? Number(v) : v);

/** Compare two column values in `dir`; unknowns (null/undefined) are always greater, i.e. last. Returns 0 on a tie. */
export function compareValues(a: SortValue, b: SortValue, dir: SortDir): number {
  if (isNull(a) && isNull(b)) return 0;
  if (isNull(a)) return 1;
  if (isNull(b)) return -1;
  const x = toComparable(a);
  const y = toComparable(b);
  const r = typeof x === 'string' || typeof y === 'string' ? String(x).localeCompare(String(y)) : x - y;
  return r * dir;
}

export interface SortOptions<T, K extends string> {
  /** The value of column `key` for an item. */
  getValue: (item: T, key: K) => SortValue;
  /** Breaks ties and orders all-unknown rows. */
  tiebreak?: (a: T, b: T) => number;
  /** Keys with their own full ordering (ignores direction), e.g. { attention: byAttention }. */
  custom?: Partial<Record<K, (a: T, b: T) => number>>;
}

/** A new array sorted by `sort`. Stable; the input is untouched. */
export function sortItems<T, K extends string>(items: readonly T[], sort: SortState<K>, opts: SortOptions<T, K>): T[] {
  const tie = opts.tiebreak ?? (() => 0);
  const custom = opts.custom?.[sort.key];
  return [...items].sort((a, b) => {
    if (custom) return custom(a, b);
    return compareValues(opts.getValue(a, sort.key), opts.getValue(b, sort.key), sort.dir) || tie(a, b);
  });
}

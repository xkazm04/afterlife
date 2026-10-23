import { describe, expect, it } from 'vitest';
import { ariaSort, compareText, compareValues, nextSort, sortItems, type SortState } from './sort';

type Key = 'attention' | 'name' | 'needs';
const initial: SortState<Key> = { key: 'attention', dir: -1 };
const rules = { initial, defaultDir: (k: Key): 1 | -1 => (k === 'name' ? 1 : -1) };

describe('nextSort', () => {
  it('starts a new column in its default direction', () => {
    expect(nextSort(initial, 'name', rules)).toEqual({ key: 'name', dir: 1 });
    expect(nextSort(initial, 'needs', rules)).toEqual({ key: 'needs', dir: -1 });
  });
  it('flips on the second click and resets on the third', () => {
    const a = nextSort(initial, 'name', rules);
    const b = nextSort(a, 'name', rules);
    expect(b).toEqual({ key: 'name', dir: -1 });
    expect(nextSort(b, 'name', rules)).toEqual(initial);
  });
  it('treats the opposite default as already flipped', () => {
    expect(nextSort({ key: 'needs', dir: 1 }, 'needs', rules)).toEqual(initial);
  });
  it('does not stall when the initial sort is the opposite of its column default', () => {
    const asc = { initial: { key: 'name', dir: 1 } as SortState<Key>, defaultDir: () => -1 as const };
    const a = nextSort(asc.initial, 'name', asc);
    expect(a).toEqual({ key: 'name', dir: -1 });
    expect(nextSort(a, 'name', asc)).toEqual(asc.initial);
  });
  it('reports aria-sort', () => {
    expect(ariaSort({ key: 'name', dir: 1 }, 'name')).toBe('ascending');
    expect(ariaSort({ key: 'name', dir: -1 }, 'name')).toBe('descending');
    expect(ariaSort({ key: 'name', dir: 1 }, 'needs')).toBe('none');
  });
});

describe('compareValues', () => {
  it('orders numbers and strings in both directions', () => {
    expect(compareValues(1, 2, 1)).toBeLessThan(0);
    expect(compareValues(1, 2, -1)).toBeGreaterThan(0);
    expect(compareValues('a', 'b', 1)).toBeLessThan(0);
    expect(compareValues(true, false, -1)).toBeLessThan(0);
  });
  it('always puts unknowns last, whatever the direction', () => {
    expect(compareValues(null, 5, 1)).toBeGreaterThan(0);
    expect(compareValues(null, 5, -1)).toBeGreaterThan(0);
    expect(compareValues(5, undefined, -1)).toBeLessThan(0);
    expect(compareValues(null, undefined, 1)).toBe(0);
  });
});

interface Row {
  name: string;
  needs: number | null;
}
const rows: Row[] = [
  { name: 'b', needs: 2 },
  { name: 'a', needs: null },
  { name: 'c', needs: 5 },
  { name: 'd', needs: 2 },
];
const byName = (a: Row, b: Row) => a.name.localeCompare(b.name);
const opts = {
  getValue: (r: Row, k: Key) => (k === 'name' ? r.name : k === 'needs' ? r.needs : 0),
  tiebreak: byName,
  custom: { attention: (a: Row, b: Row) => (b.needs ?? 0) - (a.needs ?? 0) || byName(a, b) },
};

describe('sortItems', () => {
  it('sorts by a column and breaks ties with the tiebreak', () => {
    expect(sortItems<Row, Key>(rows, { key: 'needs', dir: -1 }, opts).map((r) => r.name)).toEqual(['c', 'b', 'd', 'a']);
    expect(sortItems<Row, Key>(rows, { key: 'needs', dir: 1 }, opts).map((r) => r.name)).toEqual(['b', 'd', 'c', 'a']);
  });
  it('uses a custom ordering for its key', () => {
    expect(sortItems(rows, initial, opts).map((r) => r.name)).toEqual(['c', 'b', 'd', 'a']);
  });
  it('does not mutate the input', () => {
    const copy = [...rows];
    sortItems<Row, Key>(rows, { key: 'name', dir: 1 }, opts);
    expect(rows).toEqual(copy);
  });
});

describe('number-aware text order', () => {
  it('sorts svc-2 before svc-10 in a text column, ascending and descending', () => {
    const rows = [{ n: 'svc-10' }, { n: 'svc-2' }, { n: 'svc-1' }];
    const opts = { getValue: (r: { n: string }) => r.n };
    expect(sortItems(rows, { key: 'name' as const, dir: 1 }, opts).map((r) => r.n)).toEqual(['svc-1', 'svc-2', 'svc-10']);
    expect(sortItems(rows, { key: 'name' as const, dir: -1 }, opts).map((r) => r.n)).toEqual(['svc-10', 'svc-2', 'svc-1']);
  });
  it('exports the same order as compareText', () => {
    expect(compareText('svc-2', 'svc-10')).toBeLessThan(0);
  });
});

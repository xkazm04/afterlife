// "/" and Escape for a SearchField, one rule for Fleet, Ladder and Needs you (each binds them through its keymap).
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { useSearchKeys, type SearchKeyOptions } from '../useSearchKeys';

/** Mounts the hook in a probe component and hands back its handlers. */
function mount(o: SearchKeyOptions): ReturnType<typeof useSearchKeys> {
  let got: ReturnType<typeof useSearchKeys> | undefined;
  function Probe() {
    got = useSearchKeys(o);
    return null;
  }
  renderToStaticMarkup(<Probe />);
  if (!got) throw new Error('not mounted');
  return got;
}

const setup = (query: string, clearFromAnywhere?: boolean) => {
  const input = { focus: vi.fn(), select: vi.fn() };
  const clear = vi.fn();
  const toTable = vi.fn();
  const keys = mount({ searchRef: { current: input as unknown as HTMLInputElement }, query, clear, toTable, ...(clearFromAnywhere ? { clearFromAnywhere } : {}) });
  const esc = (target: unknown) => keys.escape({ target } as unknown as KeyboardEvent);
  return { input, clear, toTable, keys, esc };
};

describe('useSearchKeys', () => {
  it('"/" focuses the field and selects its text', () => {
    const t = setup('');
    t.keys.focusSearch();
    expect([t.input.focus.mock.calls.length, t.input.select.mock.calls.length]).toEqual([1, 1]);
  });
  it('Escape in the field clears a query and returns to the table', () => {
    const t = setup('abc');
    expect(t.esc(t.input)).toBe(true);
    expect([t.clear.mock.calls.length, t.toTable.mock.calls.length]).toEqual([1, 1]);
  });
  it('Escape in an empty field returns to the table without clearing', () => {
    const t = setup('');
    expect(t.esc(t.input)).toBe(true);
    expect([t.clear.mock.calls.length, t.toTable.mock.calls.length]).toEqual([0, 1]);
  });
  it('Escape elsewhere does nothing (Fleet, Needs you), and says so', () => {
    const t = setup('abc');
    expect(t.esc({})).toBe(false);
    expect([t.clear.mock.calls.length, t.toTable.mock.calls.length]).toEqual([0, 0]);
  });
  it('clearFromAnywhere (Ladder): Escape on the table clears the query and leaves focus where it is', () => {
    const t = setup('abc', true);
    expect(t.esc({})).toBe(true);
    expect([t.clear.mock.calls.length, t.toTable.mock.calls.length]).toEqual([1, 0]);
    const empty = setup('', true);
    expect(empty.esc({})).toBe(false);
    expect(empty.clear).not.toHaveBeenCalled();
  });
});

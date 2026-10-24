// A click on a sortable column header must leave keyboard focus on the treegrid. A <button> takes focus on mouse-down
// (tabIndex -1 does not stop that), and useRowNavigation ignores keys whose target is not the table itself, so after
// sorting by a click the arrow keys did nothing and the selection dimmed until a row was clicked.
// No DOM here (vitest runs in node): the handler HeaderCell gives its button is called with a stand-in event.
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { HeaderCell } from '../HeaderCell';

type Handlers = { onMouseDown?: (e: unknown) => void; onClick?: () => void };

const fakeDown = (button = 0) => {
  const focus = vi.fn();
  const table = { focus };
  const e = { button, preventDefault: vi.fn(), currentTarget: { closest: vi.fn((sel: string) => (sel === '[role="treegrid"]' ? table : null)) } };
  return { e, focus };
};

describe('HeaderCell keeps focus on the table', () => {
  const onSort = vi.fn();
  const el = HeaderCell({ sortKey: 'name', sort: { key: 'name', dir: 1 }, onSort, children: 'Name' }) as ReactElement<Handlers>;

  it('a mouse-down on a sortable header does not move focus to the button, and focuses the treegrid', () => {
    const { e, focus } = fakeDown();
    el.props.onMouseDown?.(e);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('still sorts on click', () => {
    el.props.onClick?.();
    expect(onSort).toHaveBeenCalledWith('name');
  });
});

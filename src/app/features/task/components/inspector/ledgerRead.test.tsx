// The Proof Block's "Ledger read" says "no rows" for any task that holds none, fixture or not: in live mode a fixture task's
// ledger is its merge request's slice of the real chain, and that slice can be empty.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { loadTasks } from '../../model/build/loadTasks';
import { TaskInspector } from './TaskInspector';

const held = loadTasks()[0]!;
const props = { clock: { ageSec: 12, now: '14:22' }, sel: null, row: null, open: { words: false, trace: false, ledger: false }, onOpen: () => undefined };
const text = (task: typeof held) =>
  renderToStaticMarkup(createElement(ToastProvider, null, createElement(TaskInspector, { task, ...props }))).replace(/<[^>]+>/g, ' ');

describe('the Proof Block "Ledger read"', () => {
  it('states the poll age for a task that holds rows', () => {
    expect(held.fixture && held.ledger.length > 0).toBe(true);
    expect(text(held)).toContain('12 s ago · 14:22');
  });
  it('says "no rows" for a fixture task whose chain slice is empty, not a read age', () => {
    const empty = text({ ...held, ledger: [] });
    expect(empty).toContain('no rows');
    expect(empty).not.toContain('12 s ago');
  });
  it('says "no rows" for a source task with no fixture and no rows', () => {
    expect(text({ ...held, fixture: false, ledger: [] })).toContain('no rows');
  });
});

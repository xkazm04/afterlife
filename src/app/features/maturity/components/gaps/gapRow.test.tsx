// The gaps table carries each sent gap's next move, the same move (one source, model/flow/moves.ts) as the stage page's
// After merge section. A click on the move acts on that gap and does not also select the row.
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Phase } from '../../model/flow/credit';
import { nextMove } from '../../model/flow/moves';
import { ctx } from '../../model/testCtx';
import { AfterMerge } from '../inspector/gap/AfterMerge';
import { GapRow } from './GapRow';
import { GapState } from './GapState';

type El = ReactElement<{ children?: ReactNode; onClick?: (e: unknown) => void }>;
const g1 = ctx.gap('g1')!;
const row = (phase: Phase, on = { onAct: vi.fn(), onSelect: vi.fn() }) => (
  <GapRow gap={g1} picked={false} phase={phase} mr="!22" selected={false} alt={false} live={false} onPick={() => {}} onSelect={on.onSelect} onOpen={() => {}} onAct={on.onAct} />
);

/** The path from the root to the first host element whose text is `label`, expanding this folder's own components. */
function pathTo(node: ReactNode, label: string, expand: ReadonlySet<unknown>): El[] | null {
  if (Array.isArray(node)) {
    for (const n of node) {
      const p = pathTo(n, label, expand);
      if (p) return p;
    }
    return null;
  }
  if (!isValidElement(node)) return null;
  const el = node as El;
  if (typeof el.type === 'function' && expand.has(el.type)) return pathTo((el.type as (p: unknown) => ReactNode)(el.props), label, expand);
  if (el.props.children === label && el.props.onClick) return [el];
  const p = pathTo(el.props.children, label, expand);
  return p ? [el, ...p] : null;
}

/** A click that bubbles from the button up through its ancestors until one stops it. */
function click(path: El[]) {
  let stopped = false;
  const e = { stopPropagation: () => (stopped = true) };
  for (const el of [...path].reverse()) {
    if (stopped) return;
    el.props.onClick?.(e);
  }
}

describe('GapRow: the next move in the row', () => {
  it('an opened gap offers its merge, marked simulated; a credited gap offers nothing', () => {
    const opened = renderToStaticMarkup(row('opened'));
    expect(opened).toMatch(/<button[^>]*>Merge in GitLab<\/button>/);
    expect(opened).toContain('simulated');
    expect(renderToStaticMarkup(row('credited'))).not.toContain('<button');
  });
  it('clicking the move acts on that gap and does not select the row', () => {
    const on = { onAct: vi.fn(), onSelect: vi.fn() };
    const path = pathTo(GapRow(row('opened', on).props), 'Merge in GitLab', new Set([GapState]));
    expect(path).not.toBeNull();
    click(path!);
    expect(on.onAct).toHaveBeenCalledExactlyOnceWith({ type: 'merge', id: 'g1' });
    expect(on.onSelect).not.toHaveBeenCalled();
  });
});

describe('AfterMerge: the stage page reads the same move', () => {
  it('a no lift shows the run nextMove names', () => {
    const html = renderToStaticMarkup(<AfterMerge ctx={ctx} gap={g1} phase="nolift" now={g1.from} mr="!22" dispatch={() => {}} />);
    expect(html).toContain(`>${nextMove('nolift', g1)!.label}</button>`);
  });
});

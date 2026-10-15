// The class page's "Act" card: the buttons the class can take, or, when it has none, the reason (the same words the
// Ladder's dock gives for r), never an empty card.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Promotion } from '@/lib/promotion';
import type { ClassRow } from '../../model/types';
import { ALL_KINDS } from '../../model/view/moves';
import { ClassDetail, type ClassDetailProps } from './ClassDetail';

vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

const row = (over: Partial<ClassRow>): ClassRow => ({ id: 'dep-bump.patch', track: 'T1', ceiling: 'hands_off', tier: 'supervised', lease_days: null, lastMove: '', pending: null, record: null, ...over });
const render = (cls: ClassRow, promotion: Promotion): string =>
  renderToStaticMarkup(
    <ClassDetail
      cls={cls} track={undefined} tracksDemo={false} live promotion={promotion} policy={null} ledger={[]} kinds={ALL_KINDS} onToggleKind={() => undefined}
      writeTo={null} viewOf={() => undefined} promote={{ ask: null, view: undefined }} onRevoke={() => undefined} onTargets={() => undefined} onPromote={() => undefined}
    />,
  );
/** The text of the Act card: from its heading to the next card's. */
const act = (html: string): string => (html.match(/Act<[\s\S]*?(?=<section|$)/)?.[0] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const cases: [string, Partial<ClassRow>, Promotion['kind'], string][] = [
  ['a human-only class', { tier: 'human_only', ceiling: 'human_only' }, 'never', 'never an agent'],
  ['a class with no record yet', { cell: 'no_record' }, 'norecord', 'no record yet: not trusted, nothing to lower'],
  ['a class whose tier is unknown', { cell: null }, 'untiered', 'its tier is unknown'],
];

describe('the Act card', () => {
  it.each(cases)('%s: says why there is no act', (_name, over, kind, why) => {
    expect(act(render(row(over), { kind } as Promotion))).toContain(`Nothing to do: ${why}`);
  });
  it('a class that can be revoked shows its buttons and no reason', () => {
    const text = act(render(row({}), { kind: 'notyet', next: 'hands_off', rules: [], precondition: '' }));
    expect(text).toContain('Revoke → Assisted');
    expect(text).not.toContain('Nothing to do');
  });
  it('a quarantine is offered Re-admit and no reason', () => {
    const text = act(render(row({ tier: 'quarantined' }), { kind: 'readmit' }));
    expect(text).toContain('Re-admit');
    expect(text).not.toContain('Nothing to do');
  });
});

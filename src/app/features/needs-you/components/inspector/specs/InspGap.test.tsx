// A gap's Writes card names the class and tier of that gap's own proposal (Maturity's record), not one typed for all:
// g4 is a read-only probe with no tier, so it must not claim ci-config.change at Assisted.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PROPOSAL_EXTRAS } from '@/app/features/maturity/data/proposals';
import { rungLabel } from '@/app/features/maturity/model/rungs';
import { pickNeedsYouDemo } from '../../../data/pick';
import { initialState } from '../../../model/state';
import { InspGap } from '../items/InspGap';
import { NO_ANSWER } from '@/server/actions/words';
import { UNSURE_NOTE } from '../../../model/outbox/policy';
import { UNSURE_VIEW } from '../../../model/slot/slot';
import { gapBlock } from '../../../write/desk';

const demo = pickNeedsYouDemo();
const classRow = (id: string) => {
  const out = renderToStaticMarkup(<InspGap id={id} s={{ ...initialState(demo), sel: id }} demo={demo} leftSec={0} dispatch={() => {}} />);
  return out.match(/<dt>Class<\/dt><dd>([\s\S]*?)<\/dd>/)?.[1] ?? '';
};

describe('InspGap Class row', () => {
  it.each(demo.gaps.map((g) => g.id))('%s reads its own proposal', (id) => {
    const x = PROPOSAL_EXTRAS[id];
    const row = classRow(id);
    expect(row).toContain(x?.cls ?? 'unknown');
    if (x?.tier) expect(row).toContain('role="img"');
    else expect(row).not.toContain('role="img"');
  });

  it('the probe claims no class it does not write as', () => {
    expect(classRow('g4')).not.toContain('ci-config.change');
  });
});

// An unsure gap MR (the confirm got no answer) says what the outbox says, and offers Ask again, as a policy MR's page does.
describe('InspGap Command card on an unsure write', () => {
  const g = demo.gaps.find((x) => !gapBlock(x.id, demo));
  it('names the unsure state, not a refusal, and offers Ask again', () => {
    if (!g) throw new Error('the demo holds no sendable gap');
    const s = { ...initialState(demo), sel: g.id, gapStatus: { [g.id]: 'staged' as const }, writes: { [g.id]: UNSURE_VIEW }, slots: { [g.id]: { phase: 'unsure' as const, answer: { status: 'unsure' as const, text: NO_ANSWER, simulated: false, mr: null } } } };
    const out = renderToStaticMarkup(<InspGap id={g.id} s={s} demo={demo} leftSec={0} dispatch={() => {}} />);
    expect(out).toContain(UNSURE_NOTE);
    expect(out).not.toContain('Afterlife refuses this write');
    expect(out).toContain('Ask again');
  });
});

// The head's move spells each rung as Maturity does (rungLabel), not a hand-built "R{n} {name}".
describe('InspGap head move', () => {
  it.each(demo.gaps.map((g) => g.id))('%s: from and to read as rungLabel', (id) => {
    const g = demo.gaps.find((x) => x.id === id);
    if (!g) throw new Error(id);
    const out = renderToStaticMarkup(<InspGap id={id} s={{ ...initialState(demo), sel: id }} demo={demo} leftSec={0} dispatch={() => {}} />);
    expect(out).toContain(`<span>${rungLabel(g.from, demo.rungNames)}</span><span>→</span><span>${rungLabel(g.to, demo.rungNames)}</span>`);
  });
});

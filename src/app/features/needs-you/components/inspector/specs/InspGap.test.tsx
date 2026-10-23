// A gap's Writes card names the class and tier of that gap's own proposal (Maturity's record), not one typed for all:
// g4 is a read-only probe with no tier, so it must not claim ci-config.change at Assisted.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PROPOSAL_EXTRAS } from '@/app/features/maturity/data/proposals';
import { pickNeedsYouDemo } from '../../../data/pick';
import { initialState } from '../../../model/state';
import { InspGap } from '../items/InspGap';

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

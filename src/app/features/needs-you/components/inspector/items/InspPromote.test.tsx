// The n1 card's proofs section reads its count and edit share from qa.file-bug's class record, not a typed-in figure.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../../data/pick';
import { proofsAux } from '../../../data/promote';
import { initialState } from '../../../model/state';
import { InspPromote } from './InspPromote';

describe('InspPromote', () => {
  it('shows the record\'s aux text and none of the patcher\'s figures', () => {
    const demo = pickNeedsYouDemo();
    const out = renderToStaticMarkup(<InspPromote s={initialState(demo)} demo={demo} leftSec={0} dispatch={() => {}} />);
    expect(out).toContain(proofsAux(demo.promote.record));
    expect(out).not.toContain('94 %');
    expect(out).not.toContain('code-fix.patch');
  });
});

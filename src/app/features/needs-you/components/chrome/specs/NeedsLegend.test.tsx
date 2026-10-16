// The legend's grade sentence follows GRADES (the band and the inspector's source), and its wording is pinned.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GRADES, GRADE_NEVER } from '../../../data/cra';
import { pickNeedsYouDemo } from '../../../data/pick';
import { NeedsLegend } from '../NeedsLegend';

const text = () => renderToStaticMarkup(<NeedsLegend tierMeans={pickNeedsYouDemo().tierMeans} />).replace(/<[^>]+>/g, '').replace(/&quot;/g, '"');

describe('NeedsLegend grade line', () => {
  it('names every grade with its reason, and the one Belay never says', () => {
    const out = text();
    for (const g of [...GRADES, GRADE_NEVER]) expect(out).toContain(g.name);
    for (const g of GRADES) expect(out).toContain(`${g.name} (${g.why})`);
  });

  it('pins the wording', () => {
    expect(text()).toContain('Grade: draft (a link is unresolved) → reviewable (every link resolves) → ready to sign (a person read it). Never "attested".');
  });
});

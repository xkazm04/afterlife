// The legend's grade sentence follows GRADES (the band and the inspector's source), and its wording is pinned.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GRADES, GRADE_NEVER } from '../../../data/cra';
import { pickNeedsYouDemo } from '../../../data/pick';
import { GLYPH_MEANS, NeedsLegend } from '../NeedsLegend';

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

describe('NeedsLegend row states', () => {
  it('explains every glyph a row can draw, the set-aside dash and the gap you pick among them', () => {
    const html = renderToStaticMarkup(<NeedsLegend tierMeans={pickNeedsYouDemo().tierMeans} />);
    expect(html.match(/viewBox="0 0 10 10"/g)).toHaveLength(Object.keys(GLYPH_MEANS).length);
    expect(text()).toContain('Set aside');
    expect(text()).toContain('A gap you can pick');
  });
});

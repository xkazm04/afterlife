// The legend's grade sentence follows GRADES (the band and the inspector's source), and its wording is pinned.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { capsOf } from '@/lib/keyboard/keymap';
import { NEEDS_KEYMAP } from '../../../model/keys/keymap';
import { GRADES, GRADE_NEVER } from '../../../data/cra';
import { pickNeedsYouDemo } from '../../../data/pick';
import { GLYPH_MEANS, NeedsLegend } from '../NeedsLegend';

const text = () => renderToStaticMarkup(<NeedsLegend tierMeans={pickNeedsYouDemo().tierMeans} />).replace(/<[^>]+>/g, '').replace(/&quot;/g, '"');

describe('NeedsLegend grade line', () => {
  it('names every grade with its reason, and the one Afterlife never says', () => {
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

describe('NeedsLegend key line', () => {
  it('names every key the Needs you keymap binds (Esc included)', () => {
    const line = /<div class="[^"]*keys[^"]*">(.*?)<\/div>/.exec(renderToStaticMarkup(<NeedsLegend tierMeans={pickNeedsYouDemo().tierMeans} />))?.[1]?.toLowerCase() ?? '';
    const caps = NEEDS_KEYMAP.entries.flatMap((e) => capsOf(e.keys));
    expect(caps).toContain('Esc');
    expect(caps.filter((c) => !line.includes(c.toLowerCase()))).toEqual([]);
  });
});

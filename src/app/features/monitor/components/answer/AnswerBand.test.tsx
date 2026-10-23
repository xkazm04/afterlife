import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FleetProject } from '@/lib/demo/types';
import { leadsOf, totalsOf } from '../../model/totals';
import type { Hover } from '../../hooks/useMonitor';
import { AnswerBand } from './AnswerBand';

const one = { id: 'p', name: 'p', group: 'g', state: 'watching', armed: 8, needsYou: 0, tiers: null, feed: { ageSec: 1, ok: true } } as unknown as FleetProject;

describe('AnswerBand on a fleet of one project', () => {
  it('says one lead and one project in the singular, and the all-clear too', () => {
    const projects = [one];
    const out = renderToStaticMarkup(<AnswerBand org="acme" totals={totalsOf(projects)} projects={projects} leads={leadsOf(['g'], projects)} hover={null} byId={new Map()} />);
    expect(out).toContain('1 lead · 1 project<');
    expect(out).toContain('all clear across 1 project<');
  });
});

describe('AnswerBand readout does not say a focused beat twice', () => {
  const projects = [{ ...one, name: 'docs-portal' } as FleetProject];
  const byId = new Map(projects.map((p) => [p.id, p]));
  const html = (hover: Hover) =>
    renderToStaticMarkup(<AnswerBand org="acme" totals={totalsOf(projects)} projects={projects} leads={leadsOf(['g'], projects)} hover={hover} byId={byId} />);
  /** Live regions (what a screen reader announces unasked) whose text carries the name of the control in focus. */
  const liveEchoes = (h: string, name: string) => (h.match(/<div[^>]*aria-live=[^>]*>.*?<\/div>/g) ?? []).filter((r) => r.includes(name)).length;
  /** The readout text a browse-mode reader would speak a second time: the name, not hidden from the tree. */
  const spokenTwice = (h: string, name: string) => /<div[^>]*readout[^>]*>/.test(h) && !/<div[^>]*readout[^>]*aria-hidden="true"/.test(h) && h.includes(name);

  it('is no live region carrying a focused beat or a lead', () => {
    expect(liveEchoes(html({ kind: 'project', id: 'p' }), 'docs-portal')).toBe(0);
    expect(liveEchoes(html({ kind: 'lead', group: 'g' }), 'g')).toBe(0);
  });
  it('hides the name and line the focused beat already carries as its aria-label', () => {
    expect(spokenTwice(html({ kind: 'project', id: 'p' }), 'docs-portal')).toBe(false);
  });
  it('still shows the org summary when nothing is hovered', () => {
    expect(html(null)).toContain('acme');
    expect(html(null)).not.toContain('aria-hidden="true"');
  });
});

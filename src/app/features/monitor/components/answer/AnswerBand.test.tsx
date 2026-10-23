import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FleetProject } from '@/lib/demo/types';
import { leadsOf, totalsOf } from '../../model/totals';
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

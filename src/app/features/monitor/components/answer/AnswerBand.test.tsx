import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FleetProject } from '@/lib/demo/types';
import { leadsOf, totalsOf } from '../../model/totals';
import { AnswerBand, spendLine } from './AnswerBand';

const one = { id: 'p', name: 'p', group: 'g', state: 'watching', armed: 8, needsYou: 0, tiers: null, feed: { ageSec: 1, ok: true } } as unknown as FleetProject;

describe('AnswerBand on a fleet of one project', () => {
  it('says one lead and one project in the singular, and the all-clear too', () => {
    const projects = [one];
    const out = renderToStaticMarkup(<AnswerBand org="acme" totals={totalsOf(projects)} projects={projects} leads={leadsOf(['g'], projects)} hover={null} byId={new Map()} />);
    expect(out).toContain('1 lead · 1 project<');
    expect(out).toContain('all clear across 1 project<');
  });
});

describe('AnswerBand spend line', () => {
  const band = (cost: Parameters<typeof spendLine>[0]) =>
    renderToStaticMarkup(<AnswerBand org="acme" totals={totalsOf([one])} projects={[one]} leads={leadsOf(['g'], [one])} hover={null} byId={new Map()} cost={cost} />);
  it('says what the agents spent across the metered projects', () => {
    expect(band({ costUsd: 12.5, metered: 2, of: 5 })).toContain('agents spent $12.50 across 2 metered projects · all recorded runs');
  });
  it('says nothing when no project is metered or the runs were not read: never $0', () => {
    expect(band({ costUsd: null, metered: 0, of: 5 })).not.toContain('agents spent');
    expect(band(null)).not.toContain('$');
  });
});

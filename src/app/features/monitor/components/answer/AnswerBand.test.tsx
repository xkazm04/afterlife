import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FleetProject } from '@/lib/demo/types';
import { dayRowsOf } from '@/lib/trend/rows';
import { addDays, type TrendFeed } from '@/lib/trend/trend';
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

describe('AnswerBand week', () => {
  const band = (trend: TrendFeed | null) =>
    renderToStaticMarkup(<AnswerBand org="acme" totals={totalsOf([one])} projects={[one]} leads={leadsOf(['g'], [one])} hover={null} byId={new Map()} trend={trend} />);
  const day = (back: number, needs: number) => dayRowsOf(addDays('2026-10-06', -back), [{ ...one, needsYou: needs, classTiers: {} } as FleetProject]);
  it('puts the change since last week beside the big number, and says seeded in the demo', () => {
    const out = band({ rows: [...day(7, 1), ...day(0, 3)], today: '2026-10-06', seeded: true });
    expect(out).toContain('↑ +2</span> since last week');
    expect(out).toContain('>seeded<');
  });
  it('live, fewer than 7 days: the pending line with its n, never +0', () => {
    const out = band({ rows: [...day(1, 1), ...day(0, 1)], today: '2026-10-06', seeded: false });
    expect(out).toContain('trend starts after 7 days of polling (2 so far)');
    expect(out).not.toContain('since last week');
  });
  it('not read: nothing', () => expect(band(null)).not.toContain('last week'));
});

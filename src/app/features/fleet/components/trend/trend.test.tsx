// Fleet's week: the demo draws its 28 seeded days and says seeded on every surface; live with fewer than 7 days says
// the trend starts after 7 days of polling, with its n, and never draws a 0 for the week it cannot compare.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { demoSource } from '@/server/data/demoSource';
import { DEMO } from '@/lib/demo';
import { DEMO_NOW } from '@/lib/demo/clock';
import { dayRowsOf } from '@/lib/trend/rows';
import { addDays, trendOf, utcDay, type TrendFeed } from '@/lib/trend/trend';
import { TrendSection } from '../inspector/sections/trend/TrendSection';
import { GroupTrend } from './GroupTrend';
import { TrendNote } from './TrendNote';

const today = utcDay(DEMO_NOW);
const demo: TrendFeed = { rows: demoSource.getFleetTrend(), today, seeded: true };
// three days polled, live
const young: TrendFeed = { rows: [0, 1, 2].flatMap((b) => dayRowsOf(addDays(today, -b), DEMO.fleet.projects)), today, seeded: false };
const id = DEMO.fleet.projects[0]!.id;
const group = DEMO.fleet.projects[0]!.group;

describe('the demo trend', () => {
  it('serves 28 seeded days', () => expect(trendOf(demo.rows, today).days).toBe(28));

  it('the status bar says the week and that it is seeded', () => {
    const out = renderToStaticMarkup(<TrendNote feed={demo} />);
    expect(out).toMatch(/ · since last week: [+-]?\d+ waiting · [+-]?\d+ stale/);
    expect(out).toContain('>seeded<');
  });

  it('the project card draws three 28-day strips, labelled seeded', () => {
    const out = renderToStaticMarkup(<TrendSection id={id} feed={demo} />);
    expect(out.match(/aria-label="(waiting|stale|hands-off)[^"]* over 28 days/g)).toHaveLength(3);
    expect(out).toContain('>seeded<');
    expect(out).not.toContain('trend starts after');
  });

  it('the group row hover says seeded', () => {
    expect(renderToStaticMarkup(<GroupTrend feed={demo} group={group} />)).toContain('(seeded demo history)');
  });
});

describe('live, fewer than 7 days polled', () => {
  it('says the trend starts after 7 days of polling, with its n, everywhere', () => {
    const line = 'trend starts after 7 days of polling (3 so far)';
    expect(renderToStaticMarkup(<TrendNote feed={young} />)).toContain(line);
    expect(renderToStaticMarkup(<TrendSection id={id} feed={young} />)).toContain(line);
    const cell = renderToStaticMarkup(<GroupTrend feed={young} group={group} />);
    expect(cell).toContain(`title="${line}"`);
    expect(cell.replace(/<[^>]+>/g, '')).toBe('-');
    expect(renderToStaticMarkup(<TrendNote feed={young} />)).not.toContain('seeded');
  });

  it('no feed: the card says not read', () => {
    expect(renderToStaticMarkup(<TrendSection id={id} feed={null} />)).toContain('Not read.');
  });
});

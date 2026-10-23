// Where the deep project's Fleet row differs live from demo, on purpose: the poll reads armed, last, what and webUrl
// from GitLab and the index; the demo fixture states its own (../parity.test.ts normalises exactly these three).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadFleetProject } from '@/app/features/fleet/data/loadFleetProject';
import { projectActions } from '@/app/features/fleet/model/project/view';
import { demoSource } from '../../demoSource';
import { setDataSource } from '../../select';
import type { DataSource } from '../../types';
import { fakeGroupLive } from '../fakeGroup';

let live: DataSource;
beforeAll(async () => {
  ({ live } = await fakeGroupLive());
}, 60_000);
afterAll(() => setDataSource(null));

const row = (s: DataSource, id = 'ledgerline') => s.getFleet().projects.find((p) => p.id === id);

describe('the polled project’s own fields', () => {
  it('armed: the CI file’s markers (the fake arms T4, as Setup plans against it); demo states 8', () => {
    expect([row(live)?.armed, row(demoSource)?.armed]).toEqual([1, 8]);
  });

  it('last: the newest task the index holds (!44 opened, blocked), not the fixture’s seeded line', () => {
    expect(row(live)?.last).toEqual({ at: '14:10', track: 'T4', text: '!44 opened · Bump ktor-client 3.1.2 → 3.1.4 · blocked' });
    expect(row(live)?.last).toEqual({ at: live.getEvents()[1]?.[0], track: live.getEvents()[1]?.[1], text: live.getEvents()[1]?.[2] });
    expect(row(demoSource)?.last?.text).toContain('(seeded)');
  });

  it('what: the GitLab description; webUrl: the GitLab page, which the demo fixture does not state', () => {
    expect(row(live)?.what).toBe('core banking API (demo bank)');
    expect(row(live)?.webUrl).toBe('https://gitlab.com/acme-lab/core-banking/ledgerline');
    expect(row(demoSource)?.webUrl).toBeUndefined();
    expect(row(live, 'fx-rates')?.webUrl).toBeUndefined(); // a seeded project no poll reached: no address
  });

  it('Open in GitLab links out where the index holds an address, and says why not where it does not', () => {
    setDataSource(live);
    const v = loadFleetProject('fx-rates')!.view;
    setDataSource(null);
    const open = (url: string | null) => projectActions({ ...v, webUrl: url }, 'live').find((a) => a.label === 'Open in GitLab');
    expect(open('https://gitlab.com/acme-lab/payments/fx-rates')).toEqual({ label: 'Open in GitLab', kind: 'external', href: 'https://gitlab.com/acme-lab/payments/fx-rates' });
    expect(open(v.webUrl)).toMatchObject({ kind: 'disabled', reason: 'the index stores no GitLab address yet' });
  });
});

describe('stability, read beside the fleet (never in FleetProject)', () => {
  it('live: every polled project has one (a seeded one never polled has none); demo: the deep project from its tasks, facts unknown', () => {
    const l = live.getStability();
    expect(l.ledgerline?.n).toBeGreaterThan(0);
    expect('fx-rates' in l).toBe(false);
    expect(demoSource.getStability()).toEqual({ ledgerline: { n: 2, medianSize: null, redRate: null, failed: 0, finals: 0, reverts: 0 } });
    expect(row(live)).not.toHaveProperty('stability');
  });
});

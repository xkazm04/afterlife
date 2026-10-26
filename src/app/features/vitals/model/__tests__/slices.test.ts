// Vitals on the screen host, the pure half: each band's fold is buildView's own part, and the slices fold into a view
// whose unread parts are marked pending, never shown as an empty band or zero runs.
import { describe, expect, it } from 'vitest';
import { ADJUSTMENTS, MARKERS, NOW, PROD, PROJECT, RUNS } from '../../data/__fixtures__/grinex';
import { listRows, pendingOf, vitalsView, type VitalsSlices } from '../slices';
import { adjustmentsFold, buildView, ciFold, configRow, configView, prodFold, runsCell, summarize } from '../view';

const ok = <T,>(data: T) => ({ state: 'ok' as const, data, asOf: NOW });
const UNREAD = { state: 'unread' as const };
const all = (): VitalsSlices => ({
  config: ok({ ...configView(PROJECT), now: NOW }),
  job: ok({}),
  ci: ok(ciFold(PROJECT, RUNS)),
  prod: ok(prodFold(PROJECT, PROD, MARKERS, NOW)),
  adjustments: ok({ adjustments: adjustmentsFold(PROJECT, ADJUSTMENTS) }),
});

describe('the band folds', () => {
  it('compose to buildView', () => {
    const { view, pending } = vitalsView(PROJECT.slug, all());
    expect(pending).toEqual({});
    expect(view).toEqual(buildView(PROJECT, RUNS, PROD, ADJUSTMENTS, MARKERS, NOW));
  });
  it('a list row is its config row and its runs cell', () => {
    expect({ ...configRow(PROJECT), ...runsCell(RUNS) }).toEqual(summarize(PROJECT, RUNS));
    expect(runsCell([])).toEqual({ runsStored: 0 });
  });
});

describe('the view from its slices', () => {
  it('nothing read: every part pending, the slug as the name', () => {
    const { view, pending } = vitalsView('grinex-portal', { config: UNREAD, job: UNREAD, ci: UNREAD, prod: UNREAD, adjustments: UNREAD });
    expect(pending).toEqual({ config: true, job: true, ci: true, prod: true, adjustments: true });
    expect(view.name).toBe('grinex-portal');
    expect(view).not.toHaveProperty('lastCollected');
  });
  it('a failed slice is pending with its reason; the others are read', () => {
    const { view, pending } = vitalsView(PROJECT.slug, { ...all(), prod: { state: 'error', reason: 'unreadable' } });
    expect(pending).toEqual({ prod: 'unreadable' });
    expect(view).not.toHaveProperty('production');
    expect(view.delivery.length).toBeGreaterThan(0);
  });
  it('a job in memory comes with the job slice', () => {
    const job = { startedAt: NOW };
    expect(vitalsView(PROJECT.slug, { ...all(), job: ok({ job }) }).view.job).toEqual(job);
  });
  it('pendingOf: read is undefined, unread true, failed its reason', () => {
    expect([pendingOf(ok(1)), pendingOf(UNREAD), pendingOf({ state: 'error', reason: 'not-local' })]).toEqual([undefined, true, 'not-local']);
  });
});

describe('the list rows', () => {
  it('a row has its runs only once they are read', () => {
    const rows = listRows([configRow(PROJECT)], undefined);
    expect(rows[0]).not.toHaveProperty('runs');
    expect(listRows([configRow(PROJECT)], { [PROJECT.slug]: runsCell(RUNS) })[0]?.runs?.runsStored).toBe(RUNS.length);
  });
});

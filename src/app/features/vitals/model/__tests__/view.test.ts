import { describe, expect, it } from 'vitest';
import { ADJUSTMENTS, MARKERS, NO_CLOUD, NOW, PROD, PROJECT, RUNS } from '../../data/__fixtures__/grinex';
import { agoWords, dur, share, signalValue, signedPct } from '../format';
import { collectOnOpen, loginExpired, needsCollect, newestFetch, STALE_MS } from '../freshness';
import { buildView, hostWords, summarize } from '../view';

describe('buildView and summarize', () => {
  it('summarizes a project for the list: host, CI, cloud, last collected, runs stored', () => {
    expect(summarize(PROJECT, RUNS)).toEqual({
      slug: 'grinex-portal', name: 'Grinex Portal', root: 'C:/work/grinex-portal', host: 'azure-devops · Grinex / Grinex Portal',
      ci: 'azure-pipelines · 2 pipelines', cloud: 'azure-app-insights · grinex-portal-ai', lastCollected: '2026-10-25T11:55:00.000Z', runsStored: 11,
    });
  });
  it('a project with nothing collected has no lastCollected key, never an epoch', () => {
    expect(summarize(PROJECT, [])).not.toHaveProperty('lastCollected');
  });
  it('production is drawn only with a cloud connected', () => {
    expect(buildView(PROJECT, RUNS, PROD, ADJUSTMENTS, MARKERS, NOW).production).toHaveLength(5);
    expect(buildView(NO_CLOUD, RUNS, PROD, ADJUSTMENTS, MARKERS, NOW)).not.toHaveProperty('production');
  });
  it('hostWords prefers the GitLab path, else org / project, else the kind', () => {
    expect(hostWords({ kind: 'gitlab', path: 'grp/app' })).toBe('gitlab · grp/app');
    expect(hostWords({ kind: 'none' })).toBe('none');
  });
});

describe('freshness', () => {
  it('collects on open when never collected or older than 15 minutes', () => {
    expect(newestFetch(RUNS)).toBe('2026-10-25T11:55:00.000Z');
    expect(newestFetch([])).toBeUndefined();
    expect(needsCollect(undefined, NOW)).toBe(true);
    expect(needsCollect('2026-10-25T11:55:00.000Z', NOW)).toBe(false);
    expect(needsCollect(new Date(Date.parse(NOW) - STALE_MS - 1).toISOString(), NOW)).toBe(true);
  });
  it('collect on open: not while a job runs, nor right after one finished (even a failed one)', () => {
    const ago = (min: number) => new Date(Date.parse(NOW) - min * 60_000).toISOString();
    expect(collectOnOpen(undefined, undefined, NOW)).toBe(true);
    expect(collectOnOpen(ago(60), undefined, NOW)).toBe(true);
    expect(collectOnOpen(ago(60), { startedAt: ago(1) }, NOW)).toBe(false);
    expect(collectOnOpen(ago(60), { startedAt: ago(5), done: ago(2), error: 'x' }, NOW)).toBe(false);
    expect(collectOnOpen(ago(60), { startedAt: ago(40), done: ago(30), error: 'x' }, NOW)).toBe(true);
    expect(collectOnOpen(ago(5), undefined, NOW)).toBe(false);
  });
  it('finds a lapsed login in a failed probe or in the error line, with the command to renew it', () => {
    const fail = { kind: 'az-devops-runs' as const, args: {}, status: 'fail' as const, summary: "AADSTS700082: refresh token expired. Run 'az login'", at: NOW, ms: 1 };
    expect(loginExpired([fail])).toEqual({ command: 'az login', summary: fail.summary });
    expect(loginExpired([{ ...fail, kind: 'glab-auth', summary: '401' }])?.command).toBe('glab auth login');
    expect(loginExpired([{ ...fail, status: 'ok' }])).toBeUndefined();
    expect(loginExpired([], 'please run glab auth login')?.command).toBe('glab auth login');
    expect(loginExpired([], 'ENOENT')).toBeUndefined();
  });
});

describe('format', () => {
  it('durations, shares and signed percents; absent is a dash', () => {
    expect([dur(31 * 60_000), dur(144 * 60_000), dur(45_000), dur(undefined)]).toEqual(['31m', '2h 24m', '45s', '-']);
    expect([share(0.25), share(undefined)]).toEqual(['25%', '-']);
    expect([signedPct(12.4), signedPct(-8), signedPct(undefined)]).toEqual(['+12%', '-8%', '-']);
  });
  it('signal values in their unit', () => {
    expect(signalValue('requests', 28800)).toBe('28,800');
    expect(signalValue('p95-ms', 640)).toBe('640 ms');
    expect(signalValue('p95-ms', 1640)).toBe('1.64 s');
    expect(signalValue('availability', 99.9)).toBe('99.90%');
    expect(signalValue('failed-rate', 0.008)).toBe('0.80%'); // a fraction, drawn as a percent
    expect(signalValue('exceptions', undefined)).toBe('-');
  });
  it('ago words', () => {
    expect(agoWords('2026-10-25T11:55:00.000Z', NOW)).toBe('5 m ago');
    expect(agoWords(undefined, NOW)).toBe('never');
  });
});

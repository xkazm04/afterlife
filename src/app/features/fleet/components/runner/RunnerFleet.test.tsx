// No DOM: the strip is rendered to markup for a desk with rows, and for a missing fleet file.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { RunnerDesk, RunnerRow } from '@/lib/runs/desk/types';
import { lastWords, RunnerFleet } from './RunnerFleet';

const counts = { landed: 2, parked: 1, failed: 0, budget: 0, timeout: 0 };
const alpha: RunnerRow = { slug: 'alpha', path: 'C:/w/alpha', base: 'main', inFleet: true, waves: 2, last: { wave: 2, running: false, mergeable: true, merged: false, counts, open: 0 }, tokens: 12_000, costUsd: 0.75, needs: 2 };
const beta: RunnerRow = { slug: 'beta', path: '/w/beta', base: 'dev', inFleet: true, waves: 0, needs: 0 };

describe('lastWords', () => {
  it.each([
    [beta, 'no runs yet'],
    [{ ...alpha, last: { ...alpha.last!, running: true } }, 'wave 2 running'],
    [{ ...alpha, last: { ...alpha.last!, mergeable: false } }, 'wave 2 not mergeable'],
    [alpha, 'wave 2 to merge'],
    [{ ...alpha, last: { ...alpha.last!, merged: true } }, 'wave 2 merged'],
    [{ ...alpha, last: { wave: 2, running: false, mergeable: true, counts, open: 0 } }, 'wave 2 mergeable'],
  ])('%#', (row, want) => expect(lastWords(row)).toBe(want));
});

describe('RunnerFleet', () => {
  it('a row per repo with its checkout, newest wave, spend and decisions; the summary links them', () => {
    const desk: RunnerDesk = { fleet: 'ok', rows: [alpha, beta], needs: [] };
    const out = renderToStaticMarkup(<RunnerFleet desk={{ ...desk, needs: new Array(2).fill({ kind: 'parked-lane' }) }} />);
    expect(out).toContain('2 repos');
    expect(out).toContain('$0.75 spent');
    expect(out).toContain('href="/needs-you"');
    expect(out).toContain('2 to decide');
    expect(out).toContain('C:/w/alpha · main');
    expect(out).toContain('2 landed, 1 parked');
    expect(out).toContain('12.0k');
    expect(renderToStaticMarkup(<RunnerFleet desk={desk} />)).toContain('nothing to decide');
  });
  it('no fleet file says how to make one, and spends a dash, not $0', () => {
    const out = renderToStaticMarkup(<RunnerFleet desk={{ fleet: 'missing', rows: [], needs: [] }} />);
    expect(out).toContain('copy runner/fleet.example.yml');
    expect(out).toContain('- spent');
    expect(out).not.toContain('<table');
  });
});

import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { demoSource } from '@/server/data/demoSource';
import { L2Panel, type Deep } from '../../components/l2/L2Panel';
import { Answer } from '../../components/ui/Answer';
import { fleetTotals, projectLine } from '../../model/words';

vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

const fleet = demoSource.getFleet();
const text = (parts: readonly (readonly [string, string])[]) => parts.map((p) => p[0]).join('');
const answer = (over: Partial<ReturnType<typeof fleetTotals>>) => {
  const props = { totals: { ...fleetTotals([]), ...over }, tiers: [], staleTop: null, cycles: { projects: 0, gained: 0 }, intro: false, tabbable: true, locked: null, onMark: () => undefined, onLock: () => undefined, onOpen: () => undefined };
  return renderToString(createElement(Answer, props)).replace(/<!-- -->|<[^>]*>/g, '');
};

describe('the door says every proof outcome Fleet says', () => {
  it('sums the inconclusive proofs of the demo week', () => {
    const sum = fleet.projects.reduce((a, p) => a + (p.proofs7d?.inconclusive ?? 0), 0);
    expect(sum).toBe(29);
    expect(fleetTotals(fleet.projects).inc).toBe(sum);
  });
  it('leaves the week of proofs off the answer block (Fleet, the readout and L2 say it)', () => {
    expect(answer({ pass: 40, fail: 2, inc: 29 })).not.toMatch(/passed this week|inconclusive/);
  });
  it('shows them in a tower readout, and stays quiet at 0', () => {
    const p = fleet.projects.find((x) => x.state === 'watching' && x.proofs7d)!;
    expect(text(projectLine({ ...p, proofs7d: { pass: 5, fail: 1, inconclusive: 3 } }))).toContain('5 pass / 1 fail · 3 inconclusive');
    expect(text(projectLine({ ...p, proofs7d: { pass: 5, fail: 1, inconclusive: 0 } }))).not.toContain('inconclusive');
  });
  it('shows them in the L2 panel, and stays quiet at 0', () => {
    const p = fleet.projects.find((x) => x.state === 'watching' && x.proofs7d)!;
    const deep: Deep = { id: 'none', cockpit: { running: '', doingNow: '', goingWell: '', needsMe: '' }, needs: [], tracks: [], illustrative: { cockpit: false, tracks: false } };
    const panel = (inconclusive: number) =>
      renderToString(createElement(L2Panel, { p: { ...p, proofs7d: { pass: 5, fail: 1, inconclusive } }, group: 'g', classes: fleet.classes, deep, rungs: 9 })).replace(/<!-- -->|<[^>]*>/g, '');
    expect(panel(3)).toContain('pass / fail · 3 inconclusive · 7 days');
    expect(panel(0)).not.toContain('inconclusive');
  });
});

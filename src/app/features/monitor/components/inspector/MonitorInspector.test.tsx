import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FleetProject } from '@/lib/demo/types';
import type { Totals } from '../../model/types';
import { MonitorInspector } from './MonitorInspector';

const proj = (o: Partial<FleetProject>): FleetProject =>
  ({ id: 'core-api', name: 'core-api', what: '', group: 'web', state: 'watching', armed: 8, needsYou: 0, tiers: null, proofs7d: null, stages: [], feed: { ageSec: 12, ok: true }, classTiers: {}, ...o }) as unknown as FleetProject;
const totals = (o: Partial<Totals>): Totals => ({ n: 1, needsP: 0, pass: 0, fail: 0, needs: 0, stale: 0, setup: 0, unwatched: 0, watching: 1, quar: 0, ...o });

const html = (p: FleetProject | null, projects: readonly FleetProject[] = p ? [p] : [], t: Totals = totals({})) =>
  renderToStaticMarkup(
    <MonitorInspector p={p} org="acme" totals={t} projects={projects} stages={[]} deepId="deep" needs={[]} live={false} done={new Set()} onPick={() => undefined} onResolve={() => undefined} onFlash={() => undefined} onRepoll={() => undefined} />,
  );

describe('MonitorInspector on a picked project', () => {
  it('opens that project in Fleet, from the decisions and from the exits, never only the whole table', () => {
    const out = html(proj({ needsYou: 2 }));
    expect(out).toContain('href="/fleet/core-api"');
    expect(out).not.toContain('href="/fleet"');
  });
});

describe('MonitorInspector counts in the singular', () => {
  it('says one decision and one project, never "1 decisions" or "1 projects"', () => {
    const picked = html(proj({ needsYou: 1 }));
    expect(picked).toMatch(/>1<[^]*?>decision</);
    expect(picked).not.toContain('>decisions<');
    expect(html(null, [proj({ needsYou: 1 })], totals({ needs: 1, needsP: 1 }))).toContain('1 project · pick a beat');
  });
});

describe('MonitorInspector with nothing picked', () => {
  it('says nothing waits instead of drawing an empty Most waiting section', () => {
    const out = html(null, [proj({ needsYou: 0 })]);
    expect(out).toContain('Most waiting');
    expect(out).toContain('Nothing waits for you');
  });
  it('lists who waits most when someone does', () => expect(html(null, [proj({ needsYou: 3 })], totals({ needs: 3, needsP: 1 }))).not.toContain('Nothing waits'));
});

describe('MonitorInspector stability line', () => {
  const s = { n: 4, medianSize: 25, redRate: 0.5, failed: 1, finals: 2, reverts: 1 };
  const picked = (stability?: typeof s) =>
    renderToStaticMarkup(
      <MonitorInspector p={proj({})} org="acme" totals={totals({})} projects={[proj({})]} stages={[]} deepId="deep" needs={[]} live={false} done={new Set()} onPick={() => undefined} onResolve={() => undefined} onFlash={() => undefined} onRepoll={() => undefined} stability={stability} />,
    );
  it("says the picked project's agent MRs with the red rate's n", () => {
    expect(picked(s)).toContain('Agent MRs: 4 agent MRs in 7 d · median size 25 lines · red pipelines 50% (1 of 2) · reverts 1');
  });
  it('not read: no line, never a zero', () => expect(picked()).not.toContain('Agent MRs:'));
});

describe('MonitorInspector tier counts', () => {
  it('tiers not read: says so in words, never a row of zeros', () => {
    const out = html(proj({ classTiers: {} }));
    expect(out).toContain('Tiers unknown, not zero');
    expect(out).not.toMatch(/aria-label="[^"]*: 0"/);
  });
  it('tiers read: one count per tier', () => {
    const out = html(proj({ classTiers: { 'dep-bump': 'supervised' }, tiers: { hands_off: 0, supervised: 1, assisted: 0, quarantined: 0, human_only: 0 } }));
    expect(out).not.toContain('Tiers unknown');
    expect(out).toMatch(/aria-label="[^"]*: 1"/);
  });
});

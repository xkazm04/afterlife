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

describe('MonitorInspector with nothing picked', () => {
  it('says nothing waits instead of drawing an empty Most waiting section', () => {
    const out = html(null, [proj({ needsYou: 0 })]);
    expect(out).toContain('Most waiting');
    expect(out).toContain('Nothing waits for you');
  });
  it('lists who waits most when someone does', () => expect(html(null, [proj({ needsYou: 3 })], totals({ needs: 3, needsP: 1 }))).not.toContain('Nothing waits'));
});

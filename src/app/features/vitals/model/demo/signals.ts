// The demo projects' production bins and adjustments, generated back from `now` like their runs (model/demo/ci.ts).
// ILLUSTRATIVE: every figure, claim and verdict here is a placeholder for layout, not a measurement. Pure and
// deterministic. A signal a source cannot give is left out, so it draws as a dash: Log Analytics HTTP logs carry no
// availability test, so payments-gateway has none.
import type { AdjustmentLine, ProdPoint, ProdSignal, ProjectConfig, Sample } from '@/schemas/vitals';

const HOUR = 3_600_000;
const at = (ms: number): string => new Date(ms).toISOString();

/** Per signal its base value and the sample n behind one bin at peak; the counts (requests, exceptions) scale with the hour. */
type Base = Partial<Record<ProdSignal, readonly [value: number, n: number]>>;

const BASES: Record<string, Base> = {
  ledgerline: { requests: [5200, 5200], 'failed-rate': [0.004, 5200], 'p95-ms': [310, 5200], exceptions: [6, 6], availability: [99.95, 12] },
  'payments-gateway': { requests: [2600, 2600], 'failed-rate': [0.007, 2600], 'p95-ms': [480, 2600], exceptions: [4, 4] },
};

/** Busy by day, quiet by night: 0.3 at 03:00 UTC, 1 at 15:00. */
const daytime = (ms: number): number => 0.65 - 0.35 * Math.cos(((new Date(ms).getUTCHours() - 3) / 24) * 2 * Math.PI);
const wobble = (i: number): number => (((i * 104729) % 17) - 8) / 100;

/** Hourly bins over the last 7 days for each signal the project's source gives; none with no cloud connected. */
export function demoProd(cfg: ProjectConfig, nowMs: number): ProdPoint[] {
  const base = cfg.cloud.provider === 'none' ? undefined : BASES[cfg.slug];
  if (!base) return [];
  return (Object.keys(base) as ProdSignal[]).flatMap((signal) => {
    const [value, n] = base[signal] ?? [0, 0];
    return Array.from({ length: 168 }, (_, i): ProdPoint => {
      const t = nowMs - (168 - i) * HOUR;
      const binN = signal === 'availability' ? n : Math.max(1, Math.round(n * daytime(t)));
      const v = signal === 'requests' || signal === 'exceptions' ? binN : signal === 'availability' ? value : value * (1 + wobble(i));
      const binStart = at(t);
      return { key: `${signal}:${binStart}`, signal, binStart, binMin: 60, value: Number(v.toFixed(4)), n: binN };
    });
  });
}

const sample = (n: number, median: number, spread = 0.06): Sample => ({ n, median, spread });

/** Claims and Afterlife's measurements of them: credited, not earned, still measuring and only proposed. */
export function demoAdjustments(cfg: ProjectConfig, nowMs: number): AdjustmentLine[] {
  const ago = (h: number): string => at(nowMs - h * HOUR);
  if (cfg.slug === 'ledgerline') {
    return [
      { type: 'claim', id: 'adj-1', at: ago(130), by: 'agent', title: 'Cache node_modules between test jobs', target: { kind: 'ci-stage', variant: 'main-full', stage: 'test' }, direction: 'down', expectedPct: 30, ref: { mr: '!41' }, agentValue: 35 },
      { type: 'measurement', id: 'adj-1', at: ago(20), method: 'passive', base: sample(5, 14.2), head: sample(4, 10.9), verdict: 'credited', tolerance: 0.05, reason: 'head median 10.9 min vs base 14.2 min, -23%' },
      { type: 'claim', id: 'adj-2', at: ago(100), by: 'agent', title: 'Scan only the changed packages', target: { kind: 'ci-stage', variant: 'mr-feature', stage: 'scan' }, direction: 'down', expectedPct: 50, ref: { mr: '!43' }, agentValue: 55 },
      { type: 'measurement', id: 'adj-2', at: ago(30), method: 'passive', base: sample(5, 3.1), head: sample(5, 3.0), verdict: 'not-earned', tolerance: 0.05, reason: 'head median 3.0 min vs base 3.1 min, -3%' },
      { type: 'claim', id: 'adj-3', at: ago(50), by: 'person', title: 'Warm the pool before deploy-production', target: { kind: 'prod-signal', signal: 'p95-ms' }, direction: 'down', ref: { mr: '!44' } },
      { type: 'measurement', id: 'adj-3', at: ago(6), method: 'passive', base: sample(2, 318), head: sample(1, 296), verdict: 'inconclusive', tolerance: 0.05, reason: 'n below 3 on a side' },
      { type: 'claim', id: 'adj-4', at: ago(10), by: 'agent', title: 'Shard the nightly e2e in two', target: { kind: 'ci-stage', variant: 'nightly', stage: 'e2e' }, direction: 'down', expectedPct: 40, ref: { branch: 'afterlife/shard-e2e' }, agentValue: 48 },
    ];
  }
  if (cfg.slug === 'payments-gateway') {
    return [
      { type: 'claim', id: 'adj-1', at: ago(90), by: 'agent', title: 'Run the contract tests in parallel', target: { kind: 'ci-stage', variant: 'main-full', stage: 'test' }, direction: 'down', expectedPct: 25, ref: { mr: '!310' }, agentValue: 30 },
      { type: 'measurement', id: 'adj-1', at: ago(12), method: 'passive', base: sample(5, 18.1, 0.4), head: sample(4, 16.9, 0.5), verdict: 'inconclusive', tolerance: 0.05, reason: 'spread above the change' },
    ];
  }
  return [];
}

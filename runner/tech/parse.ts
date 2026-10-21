// T3's pure half, ported from Ascent's /infinite driver (SKILL.md "T3 measurement", infinite.mjs parseTech and
// techDelta): how a metric reads its value off one run, the mean and spread of its runs, and the before -> after
// delta per metric - `gain` signed so positive is always better, `breakthrough` (gain at or above the threshold)
// and `noisy` (either side's spread at or above the threshold: not evidence either way).
import fs from 'node:fs';
import path from 'node:path';
import type { TechMetricDelta } from '../../src/schemas/run';
import type { TechMetric } from '../index';

/** One run of a metric's command: its combined output, its wall time, and the worktree it ran in. */
export interface TechRun {
  output: string;
  wallS: number;
  cwd: string;
}

/** One metric over its runs: a value per run (null = a red command or nothing to read), then the mean and spread. */
export interface TechSeries {
  name: string;
  values: (number | null)[];
  mean?: number;
  spread?: number;
}

export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** The metric's value off one run, or null when there is none to read. */
export function parseTech(m: TechMetric, run: TechRun): number | null {
  const p = m.parse;
  if (p.kind === 'wall') return run.wallS;
  if (p.kind === 'json-sum') {
    const file = path.join(run.cwd, p.file);
    let data: unknown;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return null;
    }
    if (typeof data !== 'object' || data === null) return null;
    const rows = Array.isArray(data) ? data : Object.values(data);
    const sum = rows.reduce((s: number, r: unknown) => s + (Number((r as Record<string, unknown> | null)?.[p.field]) || 0), 0);
    return sum * (p.scale ?? 1);
  }
  const hit = new RegExp(p.pattern, 'm').exec(run.output);
  const n = hit ? Number(hit[1]) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Mean of the runs that gave a value; spread = (max - min) / mean over them, when there are two or more. */
export function summarise(name: string, values: (number | null)[]): TechSeries {
  const ok = values.filter((v): v is number => v != null);
  const s: TechSeries = { name, values };
  if (!ok.length) return s;
  s.mean = round2(ok.reduce((a, b) => a + b, 0) / ok.length);
  if (ok.length > 1 && s.mean) s.spread = round2((Math.max(...ok) - Math.min(...ok)) / Math.abs(s.mean));
  return s;
}

/** Before -> after per metric (in the fleet file's order). Absent values stay absent, never 0. */
export function techDelta(metrics: readonly TechMetric[], before: readonly TechSeries[], after: readonly TechSeries[]): TechMetricDelta[] {
  return metrics.map((m, i) => {
    const b = before[i];
    const a = after[i];
    const change = b?.mean && a?.mean != null ? (a.mean - b.mean) / Math.abs(b.mean) : null;
    const gain = change == null ? undefined : round2(m.direction === 'up' ? change : -change);
    return {
      name: m.name,
      unit: m.parse.unit ?? (m.parse.kind === 'wall' ? 's' : ''),
      ...(b?.mean != null ? { before: b.mean } : {}),
      ...(a?.mean != null ? { after: a.mean } : {}),
      ...(gain != null ? { gain } : {}),
      threshold: m.threshold,
      breakthrough: gain != null && gain >= m.threshold,
      noisy: (b?.spread ?? 0) >= m.threshold || (a?.spread ?? 0) >= m.threshold,
    };
  });
}

/**
 * Runs on the wave tip (the base is always measured twice, SKILL.md's baseline rule): twice when any metric can
 * vary run to run - a wall time, or a metric whose two base runs differed - so its spread is seen on both sides;
 * once when every metric read the same value twice on base (bundle bytes from a build's own stats).
 */
export function afterRuns(metrics: readonly TechMetric[], before: readonly TechSeries[]): 1 | 2 {
  return metrics.some((m, i) => m.parse.kind === 'wall' || (before[i]?.spread ?? 0) > 0 || before[i]?.mean == null) ? 2 : 1;
}

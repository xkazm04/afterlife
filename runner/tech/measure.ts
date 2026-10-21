// T3 measurement (Ascent /infinite SKILL.md): a repo's frontier metrics measured on the wave base and on the wave
// tip, each in its own throwaway detached worktree (`belay-wave-tech`) with the repo's setup run in it - never a link
// to the main checkout's node_modules, since a test run through a link writes into the real one - and deleted with
// removeTree, which unlinks a junction a setup made instead of following it. Metrics run in the fleet file's order,
// through runProc with childEnv (no secret) and a ceiling each; a command that exits non-zero gives that run no
// value: a red command is not a measurement. Base runs twice; the tip once or twice (parse.ts afterRuns).
import { addWorktree, removeWorktree, worktreeDir } from '../git/worktree';
import { childEnv, runProc } from '../proc/proc';
import type { FleetRepo, TechMetric } from '../index';
import type { Log } from '../wave/events';
import { redReason, runGates } from '../lane/verify';
import { afterRuns, parseTech, round2, summarise, techDelta, type TechRun, type TechSeries } from './parse';

/** A metric command's default ceiling, minutes (the SKILL's). */
export const TECH_TIMEOUT_MIN = 20;

export interface Measured {
  series: TechSeries[];
  /** Setup was red in the measurement worktree: no metric ran. */
  setupRed?: string;
}

/** Every metric `runs` times on `sha`, in a fresh worktree that is always removed. */
export async function measureTech(repo: Pick<FleetRepo, 'path' | 'setup'>, sha: string, metrics: readonly TechMetric[], runs: number, setupTimeoutMs: number): Promise<Measured> {
  const dir = worktreeDir(repo.path, 'belay-wave-tech');
  // A run killed mid-measurement left this path behind: it is the runner's own, so it goes first.
  await removeWorktree(repo.path, dir);
  await addWorktree(repo.path, dir, sha);
  const values: (number | null)[][] = metrics.map(() => []);
  try {
    const ready = await runGates(repo.setup ?? [], dir, setupTimeoutMs);
    if (!ready.ok) return { series: metrics.map((m) => summarise(m.name, [])), setupRed: redReason('tech setup', ready) };
    for (let r = 0; r < runs; r++) {
      let last: (TechRun & { ok: boolean }) | null = null;
      for (const [i, m] of metrics.entries()) {
        if (m.command !== null) {
          const t0 = Date.now();
          const p = await runProc(m.command, [], { cwd: dir, shell: true, env: childEnv(), timeoutMs: (m.timeoutMin ?? TECH_TIMEOUT_MIN) * 60_000 });
          last = { output: `${p.stdout}\n${p.stderr}`, wallS: round2((Date.now() - t0) / 1000), cwd: dir, ok: p.code === 0 && !p.timedOut };
        }
        const v = last?.ok ? parseTech(m, last) : null;
        values[i]?.push(v == null ? null : round2(v));
      }
    }
  } finally {
    await removeWorktree(repo.path, dir);
  }
  return { series: metrics.map((m, i) => summarise(m.name, values[i] ?? [])) };
}

/**
 * The wave's T3 event: base measured twice, the tip once or twice, wave.tech logged. Best effort: a measurement that
 * throws logs nothing and costs the wave nothing; a red setup is printed and the metrics stay absent.
 */
export async function measureWave(o: { repo: FleetRepo; baseSha: string; tipSha: string; timeoutMs: number; log: Log }): Promise<void> {
  const metrics = o.repo.frontier?.metrics;
  if (!metrics?.length) return;
  try {
    const before = await measureTech(o.repo, o.baseSha, metrics, 2, o.timeoutMs);
    const after = await measureTech(o.repo, o.tipSha, metrics, afterRuns(metrics, before.series), o.timeoutMs);
    for (const red of [before.setupRed, after.setupRed]) if (red) console.error(`runner: ${o.repo.slug} T3 measurement: ${red.split('\n')[0]}`);
    o.log({ kind: 'wave.tech', from: o.baseSha, to: o.tipSha, metrics: techDelta(metrics, before.series, after.series) });
  } catch (e) {
    console.error(`runner: ${o.repo.slug} T3 measurement failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

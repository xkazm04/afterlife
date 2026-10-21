// A DONE lane's last steps, after its review: refuse agent or hook config, the diff check, the gates, and - only
// on green - one commit `belay(wave-<n>): <title>` cherry-picked onto the wave branch. A red gate can never reach
// the commit line. The commit says why (the item's evidence), what (the lane's DONE line) and which lane.
import { git, runProc } from '../proc/proc';
import type { LaneOutcome } from '../../src/schemas/run';
import type { PlanItem } from '../wave/plan';
import { diffSlips } from './hygiene';
import { GATE_RETRIES, redReason, runGates } from './verify';

export interface LandCtx {
  gates: string[];
  diffCheck?: boolean;
  baseSha: string;
  wave: number;
  waveDir: string;
  timeoutMs: number;
}

export interface Landing {
  outcome: LaneOutcome;
  parkReason?: string;
  commit?: string;
  flaky?: string[];
  output?: string;
}

/**
 * Paths that configure the agent or the hooks git runs: claude's project settings and MCP servers, and the
 * usual in-repo hook dirs. The lane prompt already forbids these; a landed one would arm every later wave
 * stacked on this branch (claude hooks run with the model key), so the runner enforces it.
 */
const ARMED_PATH = /^(\.claude\/|\.mcp\.json$|\.husky\/|\.githooks\/)/;

/** Files the lane changed against base (tracked and untracked), NUL-split so no name is quoted. */
async function changedFiles(dir: string, baseSha: string): Promise<string[]> {
  await git(dir, ['add', '-A']);
  return (await git(dir, ['diff', '--cached', '--name-only', '-z', baseSha])).split('\0').filter(Boolean);
}

/** The commit body: the item's evidence and the lane's own DONE claim, so the commit says why without the run file. */
export const commitBody = (item: PlanItem, done: string): string => [item.why && `Why: ${item.why}`, done && `Done: ${done}`, `Lane: ${item.lane}`].filter(Boolean).join('\n\n');

export async function verifyAndLand(ctx: LandCtx, dir: string, item: PlanItem, done: string): Promise<Landing> {
  const changed = (await git(dir, ['status', '--porcelain'])) !== '' || (await git(dir, ['rev-parse', 'HEAD'])) !== ctx.baseSha;
  if (!changed) return { outcome: 'parked', parkReason: 'DONE claimed but nothing changed' };
  const armed = (await changedFiles(dir, ctx.baseSha)).filter((f) => ARMED_PATH.test(f));
  if (armed.length) return { outcome: 'parked', parkReason: `edits agent or hook config: ${armed.slice(0, 5).join(', ')}` };
  if (ctx.diffCheck) {
    const slips = await diffSlips(dir, ctx.baseSha);
    if (slips.length) return { outcome: 'failed', parkReason: `diff check: whitespace the lane added\n${slips.join('\n')}` };
  }
  const gates = await runGates(ctx.gates, dir, ctx.timeoutMs, GATE_RETRIES);
  // A red gate's output, or a flaky one's (red, then green on rerun): both go to the lane's gate log.
  const flaky = { ...(gates.flaky?.length ? { flaky: gates.flaky } : {}), ...(gates.output ? { output: gates.output } : {}) };
  if (!gates.ok) return { outcome: 'failed', parkReason: redReason('gate', gates), ...flaky };
  await git(dir, ['reset', '--soft', ctx.baseSha]);
  await git(dir, ['add', '-A']);
  await git(dir, ['commit', '-m', `belay(wave-${ctx.wave}): ${item.title}`, '-m', commitBody(item, done)]);
  const sha = await git(dir, ['rev-parse', 'HEAD']);
  const pick = await runProc('git', ['-C', ctx.waveDir, 'cherry-pick', sha]);
  if (pick.code !== 0) {
    await runProc('git', ['-C', ctx.waveDir, 'cherry-pick', '--abort']);
    return { outcome: 'parked', parkReason: 'cherry-pick onto the wave branch conflicted', ...flaky };
  }
  return { outcome: 'landed', commit: await git(ctx.waveDir, ['rev-parse', 'HEAD']), ...flaky };
}

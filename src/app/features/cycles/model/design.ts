// Designing the next cycle in the app: the changes it could carry, the rules that keep its credit attributable, and
// the planned cycle a design becomes. Pure.
import { STAGES, type Stage } from '@/schemas/stages';
import type { CyclesData } from './build';
import { stageTheme } from './plan';
import { reach } from './replay';
import type { Cycle, CycleChange } from './types';

/** The most changes one cycle may carry: a week's rescan must still say which change failed. */
export const WIP_CAP = 4;

export interface Candidate {
  /** Stable id: the gap id for a proposal, "next:<stage>" for a next-rung draft. */
  id: string;
  stage: Stage;
  from: number | null;
  to: number;
  title: string;
  /** proposal: the T6 autopilot drafted it (it has a diff). next: the stage's next rung; T6 drafts it once picked. */
  source: 'proposal' | 'next';
  kind: 'mr' | 'probe';
  lines?: number;
  why: string;
  /** Why it cannot be picked now, if it cannot. */
  blocked: string | null;
}

/**
 * Every change the next cycle could carry. The planned cycle's own changes (proposals and carried retries) come
 * first; then, for each stage none of them covers, its next rung (or a probe, when the rung is unknown). A stage the
 * running cycle is lifting is blocked: nobody plans on a rung that is still moving.
 */
export function candidates(data: CyclesData): Candidate[] {
  const running = data.cycles.find((c) => c.state === 'running');
  const planned = data.cycles.find((c) => c.state === 'planned');
  const moving = new Set(running?.changes.map((c) => c.stage) ?? []);
  const block = (s: Stage) => (moving.has(s) ? `${running?.id ?? 'the running cycle'} is lifting ${s}` : null);
  const out: Candidate[] = (planned?.changes ?? []).map((c, i) => ({
    id: c.gap ?? `carried:${c.stage}:${i}`,
    stage: c.stage,
    from: c.from,
    to: c.to,
    title: c.title,
    source: 'proposal',
    kind: c.kind === 'probe' ? 'probe' : 'mr',
    lines: c.lines,
    why: c.why,
    blocked: block(c.stage),
  }));
  for (const s of STAGES) {
    if (out.some((c) => c.stage === s)) continue;
    const now = data.scanned[s];
    const next = data.next[s];
    if (now == null) {
      out.push({ id: `next:${s}`, stage: s, from: null, to: 1, title: `Probe ${s} before proposing anything`, source: 'next', kind: 'probe', why: 'unknown, never zero: a read-only probe first', blocked: block(s) });
    } else if (next != null && next > now && now < 4) {
      const name = data.rungNames[next] ?? `R${next}`;
      out.push({ id: `next:${s}`, stage: s, from: now, to: next, title: `Lift ${s} to R${next} (${name})`, source: 'next', kind: 'mr', why: 'T6 drafts the MR once you pick it', blocked: block(s) });
    }
  }
  return out;
}

/** One rule a design breaks. */
export interface Problem {
  rule: 'one-per-stage' | 'wip' | 'moving' | 'empty';
  text: string;
}

/** The rules a design must keep. An empty design is allowed to be saved only as "nothing planned". */
export function checkDesign(picks: readonly Candidate[]): Problem[] {
  const out: Problem[] = [];
  const seen = new Set<Stage>();
  for (const c of picks) {
    if (seen.has(c.stage)) out.push({ rule: 'one-per-stage', text: `two changes on ${c.stage}: a rescan could not say which one earned the rung` });
    seen.add(c.stage);
    if (c.blocked) out.push({ rule: 'moving', text: c.blocked });
  }
  if (picks.length > WIP_CAP) out.push({ rule: 'wip', text: `${picks.length} changes: at most ${WIP_CAP} per cycle, so a red rescan still says which change failed` });
  if (!picks.length) out.push({ rule: 'empty', text: 'nothing picked: the cycle would close with nothing to credit' });
  return out;
}

/** What a design would cost and earn. */
export function designSummary(picks: readonly Candidate[]) {
  const changes = picks.map(asChange);
  return {
    mrs: picks.filter((c) => c.kind === 'mr').length,
    probes: picks.filter((c) => c.kind === 'probe').length,
    lines: picks.reduce((n, c) => n + (c.lines ?? 0), 0),
    drafted: picks.filter((c) => c.source === 'next').length,
    reach: changes.reduce((n, c) => n + reach(c), 0),
  };
}

function asChange(c: Candidate): CycleChange {
  return {
    mr: null, gap: c.id, kind: c.kind, stage: c.stage, from: c.from, to: c.to, title: c.title, verdict: 'planned',
    why: c.source === 'next' ? `designed in Afterlife; ${c.why}` : c.why, lines: c.lines,
  };
}

/** The screen data with the planned cycle replaced by a design (its theme follows its stages). */
export function applyDesign(data: CyclesData, picks: readonly Candidate[]): CyclesData {
  const theme = picks.length ? stageTheme(picks.map((c) => c.stage)) : 'Nothing planned yet';
  const cycles: Cycle[] = data.cycles.map((c) => (c.state === 'planned' ? { ...c, theme, changes: picks.map(asChange) } : c));
  return { ...data, cycles };
}

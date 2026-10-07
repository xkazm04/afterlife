import type { ActionClass, Task, Track } from '@/lib/demo';
import type { ChainLink, ChainSeed, Hunk, TaskCheck, TaskClaim, TaskDetail, TaskView, Verdict } from '../types';
import { chainLedger } from './ledger';

export interface BuildInput {
  /** Rows of the demo dataset; they win over the fixture where they have a value. */
  tasks: readonly Task[];
  tracks: readonly Track[];
  actionClasses: readonly ActionClass[];
  details: Readonly<Record<string, TaskDetail>>;
  order: readonly string[];
}

const SEEDED = /seeded/;

/** The dataset's quote replaces the third hunk line (the added one), minus its "+" marker. */
function withQuote(hunk: Hunk | undefined, quote: string | undefined): Hunk | null {
  if (!hunk) return null;
  if (!quote) return hunk;
  const lines = hunk.lines.map((l, i) => (i === 2 ? ([l[0], quote.replace(/^\+\s?/, '')] as const) : l));
  return { ...hunk, lines };
}

/** The stored word, faithfully: only the four known words survive, and anything else is UNKNOWN, never a pass. */
export function toVerdict(word: string | null | undefined): Verdict {
  const w = (word ?? '').toUpperCase();
  return w === 'PASS' || w === 'FAIL' || w === 'INCONCLUSIVE' ? w : 'UNKNOWN';
}

function buildChain(seeds: readonly ChainSeed[], refs: readonly (string | null)[]): ChainLink[] {
  return seeds.map((l, i) => ({ step: l.step, obj: l.obj, at: l.at, ref: refs[i] ?? null, na: !l.obj }));
}

/** Merge one dataset row (or the fixture's own base row) with its fixture into the view the screen renders. */
function buildTask(id: string, input: BuildInput): TaskView | null {
  const detail = input.details[id];
  const base = input.tasks.find((t) => t.id === id) ?? detail?.local;
  if (!detail || !base) return null;

  const proofIn = base.proof ?? detail.proof;
  const chainIn = base.chain ?? detail.chain;
  const claimTexts = base.proof?.claims ?? detail.claims;
  if (!proofIn || !chainIn || !claimTexts) return null;

  const checks: TaskCheck[] = proofIn.checks.map((c) => {
    const [claims, link] = detail.checkMap[c.id] ?? [[], 0];
    return { id: c.id, text: c.text, ok: c.ok, decidedBy: c.decidedBy ?? 'engine', ref: c.ref, claims: [...claims], link };
  });
  const claims: TaskClaim[] = claimTexts.map((text, i) => {
    const cid = detail.claimIds[i] ?? `c${i + 1}`;
    return { id: cid, text, checks: checks.filter((k) => k.claims.includes(cid)).map((k) => k.id) };
  });
  const verdict = toVerdict(proofIn.verdict);
  const actionClass = input.actionClasses.find((a) => a.id === base.cls);

  return {
    id,
    track: base.track,
    trackName: input.tracks.find((k) => k.id === base.track)?.name ?? '',
    cls: base.cls,
    mr: base.mr,
    title: base.title,
    tierAtTime: base.tierAtTime,
    tierNow: actionClass?.tier ?? null,
    state: base.state,
    seeded: !!detail.seeded || SEEDED.test(base.title + (base.reason ?? '')),
    agent: detail.agent,
    flowRun: detail.flowRun,
    chain: buildChain(chainIn, detail.chainRefs),
    claims,
    proof: { cls: proofIn.cls, verdict, engine: proofIn.engine, digest: proofIn.digest, checks },
    agentWords: base.agentWords ?? detail.agentWords ?? '',
    countsToward: base.countsToward ?? detail.countsToward ?? '',
    envelope: detail.envelope,
    hunk: withQuote(detail.hunk, base.quote),
    stats: base.stats ?? null,
    clock: base.clock ?? null,
    grade: base.grade ?? null,
    linksResolved: base.linksResolved ?? null,
    awareAt: detail.awareAt ?? null,
    ledger: chainLedger(detail.ledger),
    trace: detail.trace,
  };
}

/** All tasks in docket order. A fixture without a base row or a proof is dropped, never invented. */
export function buildTasks(input: BuildInput): TaskView[] {
  return input.order.flatMap((id) => {
    const t = buildTask(id, input);
    return t ? [t] : [];
  });
}

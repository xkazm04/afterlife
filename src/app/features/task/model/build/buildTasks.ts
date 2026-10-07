import type { ActionClass, Task, Track } from '@/lib/demo';
import type { ChainLink, ChainSeed, Hunk, TaskCheck, TaskClaim, TaskDetail, TaskView, Verdict } from '../types';
import { chainLedger } from './ledger';

export interface BuildInput {
  /** The data source's tasks; they win over the fixture where they have a value. */
  tasks: readonly Task[];
  tracks: readonly Track[];
  actionClasses: readonly ActionClass[];
  details: Readonly<Record<string, TaskDetail>>;
  /** The fixtures' docket order. Data-source tasks with no fixture follow, in the source's order. */
  order: readonly string[];
}

/** What a task with no fixture says it does not know. */
export const UNKNOWN_AGENT = 'agent unknown';
export const UNKNOWN_RUN = 'flow run unknown';

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
    const [mapped, link] = detail.checkMap[c.id] ?? [[], 0];
    // A check from a Proof Block carries its own claim tie (null: it answers none); only a fixture check lacks one.
    const claims = c.claim === undefined ? mapped : c.claim === null ? [] : [c.claim];
    return { id: c.id, text: c.text, ok: c.ok, decidedBy: c.decidedBy ?? 'engine', ref: c.ref, claims: [...claims], link };
  });
  const claims: TaskClaim[] = claimTexts.map((text, i) => {
    const cid = base.proof?.claimIds?.[i] ?? detail.claimIds[i] ?? `c${i + 1}`;
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
    fixture: true,
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

/**
 * A data-source task the screen has no fixture for, drawn from its own fields alone: its proof's checks keep the claim
 * each answers (a check with no tie answers none), and its evidence link is the chain's Prove step when there is a chain.
 * What only a fixture holds stays unknown: no agent or flow run, no ledger or trace, no envelope or hunk. Nothing is
 * borrowed from another task.
 */
export function sourceTask(base: Task, input: Pick<BuildInput, 'tracks' | 'actionClasses'>): TaskView {
  const chain = base.chain ? buildChain(base.chain, []) : [];
  const prove = chain.findIndex((l) => l.step === 'Prove');
  const p = base.proof;
  const checks: TaskCheck[] = (p?.checks ?? []).map((c) => ({
    id: c.id, text: c.text, ok: c.ok, decidedBy: c.decidedBy ?? 'engine', ref: c.ref, claims: c.claim ? [c.claim] : [], link: prove,
  }));
  const claims: TaskClaim[] = (p?.claims ?? []).map((text, i) => {
    const cid = p?.claimIds?.[i] ?? `c${i + 1}`;
    return { id: cid, text, checks: checks.filter((k) => k.claims.includes(cid)).map((k) => k.id) };
  });
  return {
    id: base.id,
    track: base.track,
    trackName: input.tracks.find((k) => k.id === base.track)?.name ?? '',
    cls: base.cls,
    mr: base.mr,
    title: base.title,
    tierAtTime: base.tierAtTime,
    tierNow: input.actionClasses.find((a) => a.id === base.cls)?.tier ?? null,
    state: base.state,
    seeded: SEEDED.test(base.title + (base.reason ?? '')),
    fixture: false,
    agent: UNKNOWN_AGENT,
    flowRun: UNKNOWN_RUN,
    chain,
    claims,
    proof: { cls: p?.cls ?? 'no proof', verdict: toVerdict(p?.verdict), engine: p?.engine ?? 'no engine', digest: p?.digest ?? '', checks },
    agentWords: base.agentWords ?? '',
    countsToward: base.countsToward ?? '',
    envelope: null,
    hunk: null,
    stats: base.stats ?? null,
    clock: base.clock ?? null,
    grade: base.grade ?? null,
    linksResolved: base.linksResolved ?? null,
    awareAt: null,
    ledger: [],
    trace: [],
  };
}

/**
 * Every task the screen can draw: the fixtures in docket order (the dataset row wins where it has a value), then every
 * other data-source task in the source's order. A source task whose fixture cannot be built is drawn from its own fields
 * at its fixture's place; a fixture with no base row or no proof is dropped, never invented.
 */
export function buildTasks(input: BuildInput): TaskView[] {
  const fixtures = new Set(input.order);
  const listed = input.order.flatMap((id) => {
    const row = input.tasks.find((t) => t.id === id);
    const t = buildTask(id, input) ?? (row ? sourceTask(row, input) : null);
    return t ? [t] : [];
  });
  return [...listed, ...input.tasks.filter((t) => !fixtures.has(t.id)).map((t) => sourceTask(t, input))];
}

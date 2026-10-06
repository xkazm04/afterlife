// Loads the fixture's deep project (class records, inbox, maturity scan, tasks and proofs) into the index.
import { DEMO } from '@/lib/demo';
import type { NeedsYouItem, Task } from '@/lib/demo/types';
import { upsertClassTiers, type ClassTierRow } from '../repositories/fleet/classTier';
import type { Queryable } from '../repositories/sql';
import { upsertProofs } from '../repositories/work/proof';
import { upsertProposals, type ProposalKind, type ProposalRow } from '../repositories/work/proposal';
import { upsertStageCells } from '../repositories/work/stageCell';
import { upsertTasks, type TaskDetail, type TaskRow } from '../repositories/work/task';
import { countdownMs, onDayAt, parseMove, taskState } from './parse';

const DAY = 86_400_000;
const KIND: Record<string, ProposalKind> = {
  promote: 'promotion', signoff: 'cra_signoff', gaps: 'gap', readmit: 'readmit', setup: 'setup_gate',
};

export async function seedClassRecords(db: Queryable, projectId: string, now: Date): Promise<void> {
  const rows: ClassTierRow[] = DEMO.actionClasses.map((a) => ({
    projectId, classId: a.id, tier: a.tier, since: null, setBy: null,
    leaseExpires: a.lease_days === null ? null : new Date(now.getTime() + a.lease_days * DAY),
    record: a.record, move: parseMove(a.lastMove, now),
  }));
  await upsertClassTiers(db, rows);
}

function proposalRow(projectId: string, it: NeedsYouItem, openedAt: Date, now: Date): ProposalRow {
  const { id, kind, title, dueIn, count: _count, ...subject } = it;
  void _count;
  return {
    id, projectId, kind: KIND[kind] ?? 'setup_gate', state: 'open', parentId: null, title, subject,
    dueAt: dueIn ? new Date(now.getTime() + countdownMs(dueIn)) : null, openedAt, actedAt: null, actedAs: null,
  };
}

export async function seedInbox(db: Queryable, projectId: string, now: Date): Promise<void> {
  const items = DEMO.needsYou;
  const opened = (i: number): Date => new Date(now.getTime() - (items.length - i) * 60_000);
  const parents = items.map((it, i) => proposalRow(projectId, it, opened(i), now));
  await upsertProposals(db, parents);
  const gaps = parents.find((p) => p.kind === 'gap');
  await upsertProposals(
    db,
    DEMO.maturity.proposals.map((g) => ({
      id: g.id, projectId, kind: 'gap' as const, state: 'open' as const, parentId: gaps?.id ?? null, title: g.title,
      subject: { stage: g.stage, from: g.from, to: g.to, picked: g.picked, diffLines: g.diffLines },
      dueAt: null, openedAt: gaps?.openedAt ?? now, actedAt: null, actedAs: null,
    })),
  );
}

export async function seedMaturity(db: Queryable, projectId: string, now: Date): Promise<void> {
  const m = DEMO.maturity;
  const scannedAt = onDayAt(now, m.scannedAt);
  await upsertStageCells(
    db,
    m.rungs.map((r) => ({
      projectId, stage: r.stage, rung: r.now, baseRung: r.day0, nextRung: r.next, evidence: [], evidenceNote: r.evidence,
      engineVersion: m.engine, scannedAt,
    })),
  );
}

function taskRow(projectId: string, t: Task, now: Date): TaskRow {
  const detail: TaskDetail = {
    chain: t.chain, agentWords: t.agentWords, countsToward: t.countsToward, quote: t.quote, reason: t.reason,
    stats: t.stats, grade: t.grade, linksResolved: t.linksResolved,
    clock: t.clock ? { kind: t.clock.kind, dueAt: new Date(now.getTime() + countdownMs(t.clock.dueIn)).toISOString(), total: t.clock.total } : undefined,
  };
  return {
    id: t.id, projectId, track: Number(t.track.slice(1)), agent: null, actionClass: t.cls,
    mrIid: t.mr ? Number(t.mr.slice(1)) : null, title: t.title, tierAtTime: t.tierAtTime, state: taskState(t.state),
    stateLabel: t.state, startedAt: null, finishedAt: null, detail,
  };
}

export async function seedTasks(db: Queryable, projectId: string, now: Date): Promise<void> {
  await upsertTasks(db, DEMO.tasks.map((t) => taskRow(projectId, t, now)));
  await upsertProofs(
    db,
    DEMO.tasks.flatMap((t) =>
      t.proof
        ? [{
            taskId: t.id, class: t.proof.cls, verdict: t.proof.verdict.toLowerCase() as 'pass' | 'fail' | 'inconclusive',
            engineVersion: t.proof.engine.replace(/^proof-engine /, ''), engineSha256: t.proof.digest.replace(/^sha256:/, ''),
            checks: t.proof.checks, claims: t.proof.claims, block: null,
          }]
        : [],
    ),
  );
}

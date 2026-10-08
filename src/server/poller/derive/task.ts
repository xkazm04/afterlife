// One agent MR -> one task and, when a trusted bot posted a valid one for the MR's current head, its proof.
// Who is believed: the MR description counts only from an agent account (config.agents); a belay-proof block only from
// a proof account; a belay-guardrail block only from a guardrail account and only for the current head. Everything
// else on the page (a person's comment, an older head's verdict) is text and is ignored.
import type { Verdict } from '@/schemas/proof';
import type { GlDeployment, GlMergeRequest, GlNote } from '@/server/gitlab/types';
import { proofRowFromBlock, type ProofRow } from '@/server/index/repositories/work/proof';
import type { TaskDetail, TaskRow, TaskState } from '@/server/index/repositories/work/task';
import { allows, type PollerConfig } from '../config';
import { extractBlocks } from '../parse/blocks';
import { parseGuardrailBlock, type GuardrailBlock } from '../parse/guardrail';
import { parseLabels, type LabelFacts } from '../parse/labels';
import { parseProofBlock } from '../parse/proofBlock';
import { editedBefore } from '../parse/pushes';
import { parseTrailers, proseOf } from '../parse/trailers';

export interface TaskFacts {
  mr: GlMergeRequest;
  notes: readonly GlNote[];
  /** Newest first. */
  deployments: readonly GlDeployment[];
}

export interface TaskDerivation {
  task: TaskRow;
  proof: ProofRow | null;
  /** The MR moved on after its proof: the proof is not shown for it. */
  staleProof: boolean;
  /** Why something was ignored (a bad block, a proof for another task). Surfaced in the poll result, never in a screen. */
  issues: string[];
}

const byNewest = (a: GlNote, b: GlNote): number => Date.parse(b.createdAt) - Date.parse(a.createdAt);

/** The label the screen shows, and the coarse state behind it. */
export function stateOf(f: TaskFacts, labels: LabelFacts, proof: Verdict | null, stale: boolean): { state: TaskState; label: string } {
  const { mr } = f;
  if (mr.state === 'merged') {
    const live = f.deployments.filter((d) => d.status === 'success' && d.sha !== '' && d.sha === mr.sha);
    if (live.some((d) => d.environment === 'production')) return { state: 'merged', label: 'merged · in production' };
    if (live.some((d) => d.environment === 'staging')) return { state: 'merged', label: 'merged · in staging' };
    return { state: 'merged', label: 'merged' };
  }
  if (mr.state === 'closed') return { state: 'closed', label: 'closed' };
  if (labels.guardrail === 'block') return { state: 'blocked', label: 'blocked' };
  if (stale) return { state: 'started', label: 'proof stale · the head moved' };
  if (labels.proof === 'fail' || proof === 'fail') return { state: 'blocked', label: 'proof failed' };
  if (labels.proof === 'pass' && proof === 'pass') return { state: 'proved', label: 'proved · awaiting merge' };
  if (labels.proof === 'inconclusive' || proof === 'inconclusive') return { state: 'started', label: 'proof inconclusive' };
  return { state: 'started', label: 'waiting for proof' };
}

function guardrailFor(notes: readonly GlNote[], cfg: PollerConfig, head: string | null): GuardrailBlock | null {
  for (const n of notes.filter((x) => !x.system && allows(cfg.guardrail, x.author)).sort(byNewest)) {
    const g = extractBlocks(n.body, 'belay-guardrail').map(parseGuardrailBlock).filter((x): x is GuardrailBlock => x !== null).at(-1);
    if (g && (head === null || g.headSha === head)) return g;
  }
  return null;
}

export function deriveTask(f: TaskFacts, projectId: string, cfg: PollerConfig, trackOf: (cls: string) => number | null): TaskDerivation | null {
  const { mr } = f;
  if (!allows(cfg.agents, mr.author)) return null; // a person's MR is not a task
  const t = parseTrailers(mr.description);
  if (!t.task) return null;
  const issues: string[] = [];
  const labels = parseLabels(mr.labels);

  let proof: ProofRow | null = null;
  let stale = false;
  for (const n of f.notes.filter((x) => !x.system && allows(cfg.proof, x.author)).sort(byNewest)) {
    for (const raw of extractBlocks(n.body, 'belay-proof').reverse()) {
      const p = parseProofBlock(raw);
      if (!p.ok) {
        issues.push(`note ${n.id}: ${p.reason}`);
        continue;
      }
      const proofTask = /^Belay-Task:\s*(\S+)\s*$/i.exec(p.block.task.trailer)?.[1];
      if (proofTask !== t.task) continue; // the proof is for another task
      if (p.block.task.mr_iid !== undefined && p.block.task.mr_iid !== mr.iid) {
        issues.push(`note ${n.id}: proof is for !${p.block.task.mr_iid}, not !${mr.iid}`);
        continue;
      }
      if (p.block.task.head_sha && mr.sha && p.block.task.head_sha !== mr.sha) {
        stale = true;
        issues.push(`note ${n.id}: proof read ${p.block.task.head_sha.slice(0, 8)} but the head is ${mr.sha.slice(0, 8)}`);
        continue;
      }
      proof ??= proofRowFromBlock(t.task, p.block);
    }
  }
  if (proof) stale = false; // a current proof exists

  const guard = guardrailFor(f.notes, cfg, mr.sha);
  const hit = guard?.verdict === 'block' ? (guard.findings.find((x) => x.severity === 'high') ?? guard.findings[0]) : undefined;
  const words = proseOf(mr.description);
  const detail: TaskDetail = {
    ...(words ? { agentWords: words } : {}),
    ...(hit ? { quote: hit.quote, reason: hit.explanation } : {}),
    // the notes are this poll's read of the MR: whether anyone but its agent pushed to it before it merged
    ...(mr.state === 'merged' ? { edited: editedBefore(f.notes, mr.author, mr.mergedAt) } : {}),
  };
  const { state, label } = stateOf(f, labels, proof?.verdict ?? null, stale);
  const cls = t.class;
  return {
    task: {
      id: t.task, projectId, track: cls ? trackOf(cls) : null, agent: mr.author, actionClass: cls, mrIid: mr.iid,
      title: mr.title.replace(/^(draft|wip):\s*/i, ''), tierAtTime: labels.tier, state, stateLabel: label,
      startedAt: new Date(mr.createdAt), finishedAt: mr.mergedAt ? new Date(mr.mergedAt) : null, detail,
    },
    proof, staleProof: stale, issues,
  };
}

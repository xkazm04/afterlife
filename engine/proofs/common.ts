// What every proof class shares: reading the common part of the input and assembling the Proof Block
// (envelope, verdict, engine pin). A class only produces checks and evidence.
import type { Check, Claim, ProofBlock, ProofClass } from '../../src/schemas/proof';
import { verdictOf } from '../../src/schemas/proof';
import { engineInfo } from '../core/version';
import { EngineError, isRecord, optStr, rec, str, strList } from '../core/types';
import { ulid } from '../core/ulid';
import { parseDiff } from '../parse/diff';
import { checkEnvelope, measure } from '../policy/envelope';
import type { EnginePolicy } from '../policy/load';

export interface ProofBase {
  id?: string;
  task: ProofBlock['task'];
  claims: Claim[];
  action_class?: string;
  diff?: string;
  environments: string[];
}

export interface Draft {
  checks: Check[];
  evidence: ProofBlock['evidence'];
}

export interface Env {
  policy: EnginePolicy;
  now: Date;
}

export function parseClaim(raw: unknown, i: number): Claim {
  const c = rec(raw, `claims[${i}]`);
  const claim: Claim = { id: str(c.id, `claims[${i}].id`), text: str(c.text, `claims[${i}].text`) };
  if (c.quote !== undefined) {
    const q = rec(c.quote, `claims[${i}].quote`);
    claim.quote = { file: str(q.file, `claims[${i}].quote.file`), text: typeof q.text === 'string' ? q.text : '' };
  }
  return claim;
}

export function parseBase(input: unknown): ProofBase {
  const i = rec(input, 'proof input');
  const t = rec(i.task, 'task');
  const task: ProofBlock['task'] = {
    flow: str(t.flow, 'task.flow'),
    run_id: str(t.run_id, 'task.run_id'),
    project_id: typeof t.project_id === 'number' ? t.project_id : Number.NaN,
    trailer: str(t.trailer, 'task.trailer'),
  };
  if (!Number.isFinite(task.project_id)) throw new EngineError('task.project_id must be a number');
  if (typeof t.mr_iid === 'number') task.mr_iid = t.mr_iid;
  const headSha = optStr(t.head_sha, 'task.head_sha');
  if (headSha) task.head_sha = headSha;
  const claims = Array.isArray(i.claims) ? i.claims.map(parseClaim) : [];
  return {
    id: optStr(i.id, 'id'),
    task,
    claims,
    action_class: optStr(i.action_class, 'action_class'),
    diff: optStr(i.diff, 'diff'),
    environments: i.environments === undefined ? [] : strList(i.environments, 'environments'),
  };
}

/** The claim a check answers, when the input maps check names to claim ids (`claim_ids`). */
export function claimFor(input: Record<string, unknown>, check: string): string | null {
  const map = isRecord(input.claim_ids) ? input.claim_ids : {};
  return typeof map[check] === 'string' ? map[check] : null;
}

/** Classes whose diff is the agent's own change are held to the envelope; a reviewed diff (cited-diff) is only measured. */
const REVIEWS_A_DIFF: readonly ProofClass[] = ['cited-diff'];

export function assemble(cls: ProofClass, base: ProofBase, draft: Draft, env: Env): ProofBlock {
  const checks = [...draft.checks];
  let envelope: ProofBlock['envelope'] = { files: 0, lines: 0, paths_touched: [], within: true };
  if (base.diff !== undefined && REVIEWS_A_DIFF.includes(cls)) {
    const m = measure(parseDiff(base.diff));
    envelope = { files: m.files, lines: m.lines, paths_touched: m.paths, within: true };
  } else if (base.diff !== undefined) {
    if (!base.action_class) throw new EngineError('action_class is required when the input carries a diff');
    const r = checkEnvelope(env.policy, base.action_class, base.diff, base.environments);
    envelope = { files: r.files, lines: r.lines, paths_touched: r.paths_touched, within: r.within };
    checks.push({
      claim_id: null,
      name: 'inside-envelope',
      ok: r.within,
      detail: r.within ? `${r.files} files, ${r.lines} lines, no denied path` : r.violations.join('; '),
    });
  }
  return {
    schema: 'belay.proof/1',
    id: base.id ?? ulid(env.now),
    class: cls,
    task: base.task,
    claims: base.claims,
    checks,
    evidence: draft.evidence,
    verdict: verdictOf(checks, envelope.within),
    envelope,
    engine: engineInfo(),
  };
}

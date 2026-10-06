// Validates a `belay-proof` block read from an MR note. The block is text a bot wrote on a page anyone can comment on, so
// it is accepted only if every field has its exact type AND its verdict follows from its own checks (the same rule the
// gate applies). Anything else is rejected with a reason and never indexed.
import { verdictOf, type Check, type Claim, type ProofBlock, type ProofClass, type Verdict } from '@/schemas/proof';
import { field, isNum, isRec, isStr, isStrList } from './guards';

const CLASSES: readonly ProofClass[] = ['exploit-test', 'cited-diff', 'rerun-stats', 'repro', 'bench-delta', 'linked-evidence', 'score-delta', 'ledger-record'];
const VERDICTS: readonly Verdict[] = ['pass', 'fail', 'inconclusive'];
const EVIDENCE = ['job', 'artifact', 'note', 'commit'] as const;

export type ProofParse = { ok: true; block: ProofBlock } | { ok: false; reason: string };
const no = (reason: string): ProofParse => ({ ok: false, reason });

function parseClaim(v: unknown): Claim | null {
  if (!isRec(v)) return null;
  const id = field(v, 'id');
  if (id === null || !isStr(v.text)) return null;
  const q = v.quote;
  if (q === undefined) return { id, text: v.text };
  return isRec(q) && isStr(q.file) && isStr(q.text) ? { id, text: v.text, quote: { file: q.file, text: q.text } } : null;
}

function parseCheck(v: unknown): Check | null {
  if (!isRec(v) || !isStr(v.name) || !isStr(v.detail)) return null;
  if (!(v.claim_id === null || isStr(v.claim_id)) || !(v.ok === null || typeof v.ok === 'boolean')) return null;
  if (v.decidedBy !== undefined && v.decidedBy !== 'engine' && v.decidedBy !== 'human') return null;
  if (v.ref !== undefined && !isStr(v.ref)) return null;
  return {
    claim_id: v.claim_id, name: v.name, ok: v.ok, detail: v.detail,
    ...(v.decidedBy ? { decidedBy: v.decidedBy } : {}), ...(v.ref !== undefined ? { ref: v.ref } : {}),
  };
}

const list = <T>(v: unknown, one: (x: unknown) => T | null): T[] | null => {
  if (!Array.isArray(v)) return null;
  const out = v.map(one);
  return out.every((x): x is T => x !== null) ? out : null;
};

function parseTask(t: unknown): ProofBlock['task'] | null {
  if (!isRec(t) || !isNum(t.project_id)) return null;
  const flow = field(t, 'flow');
  const runId = field(t, 'run_id');
  const trailer = field(t, 'trailer');
  if (flow === null || runId === null || trailer === null) return null;
  if (t.mr_iid !== undefined && !isNum(t.mr_iid)) return null;
  if (t.head_sha !== undefined && !isStr(t.head_sha)) return null;
  return {
    flow, run_id: runId, project_id: t.project_id, trailer,
    ...(t.mr_iid !== undefined ? { mr_iid: t.mr_iid } : {}), ...(t.head_sha !== undefined ? { head_sha: t.head_sha } : {}),
  };
}

function parseEnvelope(v: unknown): ProofBlock['envelope'] | null {
  if (!isRec(v) || !isNum(v.files) || !isNum(v.lines) || !isStrList(v.paths_touched) || typeof v.within !== 'boolean') return null;
  return { files: v.files, lines: v.lines, paths_touched: v.paths_touched, within: v.within };
}

export function parseProofBlock(raw: unknown): ProofParse {
  if (!isRec(raw) || raw.schema !== 'belay.proof/1') return no('not a belay.proof/1 block');
  const cls = CLASSES.find((c) => c === raw.class);
  const verdict = VERDICTS.find((c) => c === raw.verdict);
  const id = field(raw, 'id');
  const task = parseTask(raw.task);
  const claims = list(raw.claims, parseClaim);
  const checks = list(raw.checks, parseCheck);
  const evidence = list(raw.evidence, (x) => {
    const kind = isRec(x) ? EVIDENCE.find((k) => k === x.kind) : undefined;
    return isRec(x) && kind && isStr(x.ref) ? { kind, ref: x.ref } : null;
  });
  const envelope = parseEnvelope(raw.envelope);
  const eng = raw.engine;
  if (!cls || !verdict || !id || !task || !claims || !checks || !evidence || !envelope) return no('a field is missing or has the wrong type');
  if (!isRec(eng) || !field(eng, 'version') || !field(eng, 'sha256')) return no('engine pin is missing');
  if (verdictOf(checks, envelope.within) !== verdict) return no(`verdict ${verdict} does not follow from the checks`);
  return {
    ok: true,
    block: {
      schema: 'belay.proof/1', id, class: cls, task, claims, checks, evidence, verdict, envelope,
      engine: { version: String(eng.version), sha256: String(eng.sha256) },
    },
  };
}

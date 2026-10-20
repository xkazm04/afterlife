// belay-ledger/cycles/<project-id>.jsonl, checked line by line before it is trusted (it is read from a GitLab
// repository): a bad line fails the whole file, like the event ledger.
import type { ClosedVerdict, CycleChangeRecord, CycleRecord } from '@/schemas/cycle';
import { STAGES } from '@/schemas/stages';
import { LedgerParseError } from './parse';

const VERDICTS: readonly ClosedVerdict[] = ['credited', 'nolift', 'rejected', 'resolved', 'regressed'];
const KINDS = ['mr', 'probe', 'drift'] as const;
const HASH = /^[0-9a-f]{64}$/;

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const isRung = (v: unknown): v is number => isInt(v) && v <= 4;
const str = (v: unknown): v is string => typeof v === 'string' && v !== '';
const time = (v: unknown): v is string => str(v) && !Number.isNaN(Date.parse(v));

function toChange(v: unknown, bad: (what: string) => never): CycleChangeRecord {
  if (!isRec(v)) return bad('a change is not an object');
  const kind = KINDS.find((k) => k === v.kind);
  const stage = STAGES.find((s) => s === v.stage);
  const verdict = VERDICTS.find((x) => x === v.verdict);
  if (!kind || !stage || !verdict) return bad('a change needs a known kind, stage and closed verdict');
  if (v.mr_iid !== null && !isInt(v.mr_iid)) bad('mr_iid must be an iid or null');
  if ((kind === 'mr') !== (v.mr_iid !== null)) bad('an mr change has an iid; a probe or drift has none');
  if ((v.from !== null && !isRung(v.from)) || !isRung(v.to)) bad('from and to must be rungs 0..4 (from may be null)');
  if (!str(v.title) || !str(v.why)) bad('a change needs a title and a why');
  if (v.lines !== undefined && !isInt(v.lines)) bad('lines must be a count');
  const out: CycleChangeRecord = { mr_iid: v.mr_iid as number | null, kind, stage, from: v.from as number | null, to: v.to as number, title: v.title as string, verdict, why: v.why as string };
  if (v.lines !== undefined) out.lines = v.lines as number;
  return out;
}

function toRecord(v: unknown, line: number): CycleRecord {
  const bad = (what: string): never => {
    throw new LedgerParseError(line, what);
  };
  if (!isRec(v)) return bad('not a JSON object');
  if (!isInt(v.seq) || v.seq < 1 || !isInt(v.project_id)) bad('seq and project_id must be positive integers');
  if (!str(v.theme) || !str(v.engine)) bad('theme and engine must be strings');
  if (!time(v.opened_at) || !time(v.closed_at)) bad('opened_at and closed_at must be ISO times');
  if (!str(v.prev_hash) || !HASH.test(v.prev_hash) || !str(v.hash) || !HASH.test(v.hash)) bad('prev_hash and hash must be sha256 hex');
  if (!Array.isArray(v.changes)) return bad('changes must be a list');
  return {
    seq: v.seq as number, project_id: v.project_id as number, theme: v.theme as string, opened_at: v.opened_at as string,
    closed_at: v.closed_at as string, engine: v.engine as string, changes: v.changes.map((c) => toChange(c, bad)),
    prev_hash: v.prev_hash as string, hash: v.hash as string,
  };
}

/** Parses a whole file. Blank lines are skipped; any other bad line throws LedgerParseError with its number. */
export function parseCyclesJsonl(text: string): CycleRecord[] {
  const out: CycleRecord[] = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.replace(/\r$/, '');
    if (line.trim() === '') return;
    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch {
      throw new LedgerParseError(i + 1, 'not valid JSON');
    }
    out.push(toRecord(json, i + 1));
  });
  return out;
}

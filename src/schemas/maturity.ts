// What `engine/cli.ts scan` prints (belay.maturity/0), and the one parser the server reads its artifact with, so the index
// holds exactly what the engine wrote. Unknown is never absent: a cell the scan could not decide has rung null.
import { RUNGS, STAGES, type Stage } from './stages';

export const MATURITY_SCHEMA = 'belay.maturity/0';

/** A GitLab object a rung rests on. */
export interface ScanEvidence {
  label: string;
  url: string;
}

export interface ScanCell {
  stage: Stage;
  /** Index into RUNGS (0 absent .. 4 self-proving); null = unknown, never absent. */
  rung: number | null;
  /** Every lit cell (rung >= 1) cites at least one GitLab object. */
  evidence: ScanEvidence[];
  /** One line: what held, and what the next rung lacks or which fact could not be read. */
  note: string;
  next_rung: number | null;
}

export interface MaturityScan {
  schema: typeof MATURITY_SCHEMA;
  project_id: number;
  engine_version: string;
  /** The facts' `at`: the engine reads no clock. */
  scanned_at: string;
  /** Nine cells, in STAGES order. */
  cells: ScanCell[];
}

export type ScanParse = { ok: true; scan: MaturityScan } | { ok: false; reason: string };

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const rungOrNull = (v: unknown): v is number | null => v === null || (Number.isInteger(v) && (v as number) >= 0 && (v as number) < RUNGS.length);
const isUrl = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\/\S+$/.test(v);

function cellOf(raw: unknown, stage: Stage): ScanCell | string {
  if (!isRec(raw)) return `cell ${stage} is not an object`;
  if (raw.stage !== stage) return `cell ${stage} is out of order (found ${String(raw.stage)})`;
  if (!rungOrNull(raw.rung)) return `cell ${stage}: rung must be null or 0..${RUNGS.length - 1}`;
  if (!rungOrNull(raw.next_rung)) return `cell ${stage}: next_rung must be null or 0..${RUNGS.length - 1}`;
  if (typeof raw.note !== 'string') return `cell ${stage}: note must be a string`;
  if (!Array.isArray(raw.evidence)) return `cell ${stage}: evidence must be a list`;
  const evidence: ScanEvidence[] = [];
  for (const e of raw.evidence) {
    if (!isRec(e) || typeof e.label !== 'string' || e.label === '' || !isUrl(e.url)) return `cell ${stage}: evidence must be {label, url} with an http(s) url`;
    evidence.push({ label: e.label, url: e.url });
  }
  if (raw.rung !== null && raw.rung >= 1 && evidence.length === 0) return `cell ${stage}: rung ${raw.rung} cites no GitLab object`;
  return { stage, rung: raw.rung, evidence, note: raw.note, next_rung: raw.next_rung };
}

/** Rebuilt field by field: anything else is dropped, and anything malformed refuses the whole scan. */
export function parseMaturityScan(raw: unknown): ScanParse {
  if (!isRec(raw)) return { ok: false, reason: 'the scan is not a JSON object' };
  if (raw.schema !== MATURITY_SCHEMA) return { ok: false, reason: `schema is ${JSON.stringify(raw.schema ?? null)}, not ${MATURITY_SCHEMA}` };
  if (!Number.isInteger(raw.project_id)) return { ok: false, reason: 'project_id must be an integer' };
  if (typeof raw.engine_version !== 'string' || raw.engine_version === '') return { ok: false, reason: 'engine_version must be a non-empty string' };
  if (typeof raw.scanned_at !== 'string' || Number.isNaN(Date.parse(raw.scanned_at))) return { ok: false, reason: 'scanned_at must be an ISO time' };
  if (!Array.isArray(raw.cells) || raw.cells.length !== STAGES.length) return { ok: false, reason: `cells must be the ${STAGES.length} stages` };
  const cells: ScanCell[] = [];
  for (const [i, stage] of STAGES.entries()) {
    const c = cellOf(raw.cells[i], stage);
    if (typeof c === 'string') return { ok: false, reason: c };
    cells.push(c);
  }
  return { ok: true, scan: { schema: MATURITY_SCHEMA, project_id: raw.project_id as number, engine_version: raw.engine_version, scanned_at: raw.scanned_at, cells } };
}

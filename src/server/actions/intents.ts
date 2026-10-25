// Server actions are public endpoints, so an intent is validated field by field before anything is planned. A value that
// does not match is refused, never coerced. Paths and branches are whitelisted shapes: nothing from the client can
// reach a command line except through a builder that passes it as one argument.
import { STAGES } from '@/schemas/stages';
import { TIER_ORDER } from '@/schemas/tier';
import { CLASS_ID } from '@/server/poller/parse/trailers';
import { GAP_TEMPLATES, type ActionIntent, type GapFile } from './types';
import { parseProjectIntent } from './vitals/intents';

export type IntentParse = { ok: true; intent: ActionIntent } | { ok: false; reason: string };
const no = (reason: string): IntentParse => ({ ok: false, reason });

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, re: RegExp, max: number): string | null => (typeof v === 'string' && v.length <= max && re.test(v) ? v : null);
const int = (v: unknown, min: number, max: number): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null);
const tier = (v: unknown) => TIER_ORDER.find((t) => t === v) ?? null;

const PROJECT = /^[a-z0-9][a-z0-9._-]*$/i;
const ONE_LINE = /^[^\r\n]+$/;
const BRANCH = /^belay\/[A-Za-z0-9._/-]+$/;
const FILE_PATH = /^[A-Za-z0-9._][A-Za-z0-9._/-]*$/;
const MAX_FILE = 64 * 1024;
/** A new file's preview shows every line (F84), so its cost follows its lines: bounded apart from its characters (F92). */
export const MAX_FILE_LINES = 2000;
const MAX_HUNK_LINES = 400;
/** A gap MR carries at most this many files. The screen (maturity write/gap.ts) imports it, so the bound has one home. */
export const MAX_GAP_FILES = 8;
/** A revoke-class intent lowers at most this many classes. Ladder's track write (ladder model/rules/batch) imports it. */
export const MAX_REVOKE_CHANGES = 12;
const TRACK = /^T[1-8]$/;
/** The branches Belay's other MRs plan (promote, enroll, arm, disarm): a gap never takes one (intents/paths.test.ts derives them). */
const OTHER_WRITES = /^belay\/(?:promote|enroll|arm|disarm)-/;

/** A repository path as the preview spells it: no empty, dot or .git segment, so one file has one spelling and none is inside .git. */
const pathOk = (p: string): boolean => p.split('/').every((s) => s !== '' && s !== '.' && s !== '..' && s.toLowerCase() !== '.git');
/** A name git accepts as a ref: no empty component, none starting with a dot or ending in .lock, no '..', not ending in a dot. */
const refOk = (b: string): boolean => !b.includes('..') && !b.endsWith('.') && b.split('/').every((c) => c !== '' && !c.startsWith('.') && !c.endsWith('.lock'));

/** Context (' ') and added ('+') lines, one line each, with at least one of each: context is how the hunk finds its place. */
export function hunkOf(v: unknown): string[] | null {
  if (!Array.isArray(v) || v.length < 2 || v.length > MAX_HUNK_LINES) return null;
  const ok = v.every((l) => typeof l === 'string' && l.length <= 500 && /^[ +][^\r\n]*$/.test(l));
  if (!ok || !v.some((l: string) => l.startsWith(' ')) || !v.some((l: string) => l.startsWith('+'))) return null;
  return v as string[];
}

/** The files, a reason that names the bound they pass, or null when they are not files at all. */
function files(v: unknown): GapFile[] | string | null {
  if (!Array.isArray(v) || v.length < 1 || v.length > MAX_GAP_FILES) return null;
  const out: GapFile[] = [];
  for (const f of v) {
    if (!isRec(f) || (f.content === undefined) === (f.hunk === undefined)) return null; // content or a hunk, never both
    const path = str(f.path, FILE_PATH, 200);
    if (path === null || !pathOk(path)) return null;
    if (f.hunk !== undefined) {
      const hunk = hunkOf(f.hunk);
      if (!hunk) return null;
      out.push({ path, hunk });
    } else {
      if (typeof f.content !== 'string' || f.content.length > MAX_FILE) return null;
      const lines = f.content.split('\n').length - (f.content.endsWith('\n') ? 1 : 0); // the '' after a final newline is not a line
      if (lines > MAX_FILE_LINES) return `a new file is at most ${MAX_FILE_LINES} lines: ${path} has ${lines}`;
      out.push({ path, content: f.content });
    }
  }
  return new Set(out.map((f) => f.path)).size === out.length ? out : null;
}

export function parseIntent(raw: unknown): IntentParse {
  if (!isRec(raw)) return no('the intent is not an object');
  const project = str(raw.project, PROJECT, 100);
  if (!project) return no('project is missing or not a project id');
  const proposal = raw.proposal === undefined ? undefined : str(raw.proposal, /^[\w:.-]+$/, 100);
  if (proposal === null) return no('proposal is not an inbox item id');
  const base = { project, ...(proposal ? { proposal } : {}) };

  switch (raw.kind) {
    case 'revoke-class': {
      const list = Array.isArray(raw.changes) ? raw.changes : [];
      const changes = list.flatMap((c: unknown) => (isRec(c) && str(c.class, CLASS_ID, 80) && tier(c.to) ? [{ class: c.class as string, to: tier(c.to)! }] : []));
      if (list.length < 1 || list.length > MAX_REVOKE_CHANGES || changes.length !== list.length) return no(`changes must be 1 to ${MAX_REVOKE_CHANGES} {class, to} entries with a known class and tier`);
      if (new Set(changes.map((c) => c.class)).size !== changes.length) return no('a class appears twice in changes');
      const why = raw.why === undefined ? undefined : str(raw.why, ONE_LINE, 200);
      if (why === null) return no('why must be one line of at most 200 characters');
      return { ok: true, intent: { kind: 'revoke-class', ...base, changes, ...(why ? { why } : {}) } };
    }
    case 'promote-class': {
      const cls = str(raw.class, CLASS_ID, 80);
      const to = tier(raw.to);
      return cls && to ? { ok: true, intent: { kind: 'promote-class', ...base, class: cls, to } } : no('class or tier is invalid');
    }
    case 'mark-cra-ready': {
      const issue = int(raw.issue, 1, 1_000_000_000);
      return issue ? { ok: true, intent: { kind: 'mark-cra-ready', ...base, issue } } : no('issue must be a work item iid');
    }
    case 'stage-gap-mr': {
      const stage = STAGES.find((s) => s === raw.stage);
      const gap = str(raw.gap, /^[\w-]{1,40}$/, 40);
      const title = str(raw.title, ONE_LINE, 200);
      const branch = str(raw.branch, BRANCH, 100);
      const from = int(raw.from, 0, 4);
      const to = int(raw.to, 0, 4);
      const fs = files(raw.files);
      if (typeof fs === 'string') return no(fs);
      const workItem = raw.workItem === undefined ? undefined : int(raw.workItem, 1, 1_000_000_000);
      if (!stage || !gap || !title || !branch || from === null || to === null || !fs || workItem === null || !refOk(branch)) {
        return no('gap, stage, title, branch (belay/...), from/to (0-4) and 1 to 8 files are required');
      }
      if (OTHER_WRITES.test(branch)) return no(`${branch} is a branch Belay's promote, enroll, arm or disarm MRs use: a gap names its own (belay/gap-...)`);
      if (to <= from) return no(`${stage} R${from} -> R${to} raises nothing: to must be above from`);
      return { ok: true, intent: { kind: 'stage-gap-mr', ...base, gap, stage, from, to, title, branch, files: fs, ...(workItem ? { workItem } : {}) } };
    }
    case 'apply-gap-template': {
      const stage = STAGES.find((s) => s === raw.stage);
      const from = raw.from === null ? null : int(raw.from, 0, 4);
      const to = int(raw.to, 1, 4);
      const template = GAP_TEMPLATES.find((t) => t === raw.template);
      if (!stage || (from === null && raw.from !== null) || to === null) return no('stage, from (0-4, or null when the rung is unknown) and to (1-4) are required');
      if (to <= (from ?? 0)) return no(`${stage} R${from ?? '?'} -> R${to} raises nothing: to must be above from (an unknown from counts as 0)`);
      if (!template) return no(`template must be one of ${GAP_TEMPLATES.join(', ')}`);
      return { ok: true, intent: { kind: 'apply-gap-template', ...base, stage, from, to, template } };
    }
    case 'arm-track':
    case 'disarm-track':
    case 'enroll-track': {
      const track = str(raw.track, TRACK, 2);
      return track ? { ok: true, intent: { kind: raw.kind, ...base, track } } : no('track must be T1 to T8');
    }
    case 'queue-runs':
    case 'install-skill':
    case 'enable-app-insights':
      return parseProjectIntent(raw, base); // a real project's write (actions/vitals), not the GitLab group's
    default:
      return no('unknown intent kind');
  }
}

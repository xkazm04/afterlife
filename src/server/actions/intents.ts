// Server actions are public endpoints, so an intent is validated field by field before anything is planned. A value that
// does not match is refused, never coerced. Paths and branches are whitelisted shapes: nothing from the client can
// reach a command line except through a builder that passes it as one argument.
import { STAGES } from '@/schemas/stages';
import { TIER_ORDER } from '@/schemas/tier';
import { CLASS_ID } from '@/server/poller/parse/trailers';
import type { ActionIntent, GapFile } from './types';

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
const MAX_HUNK_LINES = 400;
const TRACK = /^T[1-8]$/;

/** Context (' ') and added ('+') lines, one line each, with at least one of each: context is how the hunk finds its place. */
function hunkOf(v: unknown): string[] | null {
  if (!Array.isArray(v) || v.length < 2 || v.length > MAX_HUNK_LINES) return null;
  const ok = v.every((l) => typeof l === 'string' && l.length <= 500 && /^[ +][^\r\n]*$/.test(l));
  if (!ok || !v.some((l: string) => l.startsWith(' ')) || !v.some((l: string) => l.startsWith('+'))) return null;
  return v as string[];
}

function files(v: unknown): GapFile[] | null {
  if (!Array.isArray(v) || v.length < 1 || v.length > 8) return null;
  const out: GapFile[] = [];
  for (const f of v) {
    if (!isRec(f) || (f.content === undefined) === (f.hunk === undefined)) return null; // content or a hunk, never both
    const path = str(f.path, FILE_PATH, 200);
    if (path === null || path.split('/').includes('..') || path.endsWith('/')) return null;
    if (f.hunk !== undefined) {
      const hunk = hunkOf(f.hunk);
      if (!hunk) return null;
      out.push({ path, hunk });
    } else {
      if (typeof f.content !== 'string' || f.content.length > MAX_FILE) return null;
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
      if (list.length < 1 || list.length > 12 || changes.length !== list.length) return no('changes must be 1 to 12 {class, to} entries with a known class and tier');
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
      const workItem = raw.workItem === undefined ? undefined : int(raw.workItem, 1, 1_000_000_000);
      if (!stage || !gap || !title || !branch || from === null || to === null || !fs || workItem === null || branch.includes('..')) {
        return no('gap, stage, title, branch (belay/...), from/to (0-4) and 1 to 8 files are required');
      }
      return { ok: true, intent: { kind: 'stage-gap-mr', ...base, gap, stage, from, to, title, branch, files: fs, ...(workItem ? { workItem } : {}) } };
    }
    case 'arm-track':
    case 'disarm-track': {
      const track = str(raw.track, TRACK, 2);
      return track ? { ok: true, intent: { kind: raw.kind, ...base, track } } : no('track must be T1 to T8');
    }
    default:
      return no('unknown intent kind');
  }
}

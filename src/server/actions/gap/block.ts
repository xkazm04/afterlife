// The gap block: the CI template include lines a gap MR adds to .gitlab-ci.yml, between two marker comments, as arm's
// block does (arm/block.ts): `# belay:gap <stage> <template> begin <digest>` ... `# belay:gap <stage> <template> end`.
// Pure text: the file around the block is never re-serialised. Written beside arm's so arm's behaviour cannot move.
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import type { Stage } from '@/schemas/stages';
import type { GapTemplateId } from '../types';

const digest = (lines: readonly string[]): string => createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 12);
// wire name: `# belay:gap` markers sit in projects' CI files already merged; renaming would add a second block.
const markerRe = /^\s*# belay:gap (\S+) (\S+) begin\b/;

export interface GapBlockOf { stage: Stage; id: GapTemplateId; templates: readonly string[] }

/** The block, with its markers, at an indent. `withKey` when the file has no include: yet (the block then brings it). */
export function gapBlock(b: GapBlockOf, ind: string, withKey: boolean): string[] {
  const body = withKey ? ['include:', ...b.templates.map((t) => `  - template: ${t}`)] : b.templates.map((t) => `${ind}- template: ${t}`);
  const at = withKey ? '' : ind;
  return [`${at}# belay:gap ${b.stage} ${b.id} begin ${digest(body)}`, ...body, `${at}# belay:gap ${b.stage} ${b.id} end`];
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const base = (p: string): string => p.split('/').at(-1) ?? p;

/**
 * Null when the block can go in; else what is in the way: a gap block for the template already there, a file that is
 * not YAML, or one of its templates already included (Jobs/ or the older Security/ path: already included is nothing to do).
 */
export function gapBlocker(text: string, b: GapBlockOf): string | null {
  const marked = text.split('\n').map((l) => markerRe.exec(l)).find((m) => m && m[2] === b.id);
  if (marked) return `the default branch's .gitlab-ci.yml already has a belay:gap ${b.id} block (from ${marked[1]}'s gap MR): there is nothing to add`;
  let doc: unknown;
  try {
    doc = parse(text);
  } catch (e) {
    return `the default branch's .gitlab-ci.yml is not valid YAML (${e instanceof Error ? e.message.split('\n')[0] : 'it does not parse'}): Afterlife will not edit it`;
  }
  const inc = isRec(doc) ? doc.include : undefined;
  const have = (Array.isArray(inc) ? inc : inc === undefined ? [] : [inc]).flatMap((i) => (isRec(i) && typeof i.template === 'string' ? [i.template] : []));
  const dup = b.templates.find((t) => have.some((h) => base(h) === base(t)));
  return dup ? `the default branch's .gitlab-ci.yml already includes ${dup}: there is nothing to add for it` : null;
}

/** After the edit: the file still parses and includes every template of the block. */
export function holdsGapBlock(text: string, b: GapBlockOf): boolean {
  try {
    const doc: unknown = parse(text);
    const inc = isRec(doc) && Array.isArray(doc.include) ? doc.include : [];
    return b.templates.every((t) => inc.some((i) => isRec(i) && i.template === t));
  } catch {
    return false;
  }
}

export type GapInserted = { ok: true; content: string; added: string[]; after: number } | { ok: false; reason: string };

const significant = (l: string): boolean => l.trim() !== '' && !l.trim().startsWith('#');

/** Adds the block to the top-level include: list (or adds include: at the end). Refuses a layout it would have to rewrite. */
export function insertGapBlock(text: string, b: GapBlockOf): GapInserted {
  const lines = text.split('\n');
  const key = lines.findIndex((l) => /^include\s*:/.test(l));
  if (key < 0) {
    const tail = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
    const added = gapBlock(b, '', true);
    return { ok: true, content: [...lines.slice(0, tail), ...added, ''].join('\n'), added, after: tail };
  }
  if (!/^include\s*:\s*(#.*)?$/.test(lines[key] ?? '')) {
    return { ok: false, reason: "the default branch's .gitlab-ci.yml writes include: on one line; Afterlife adds to a block list only, so make it a list first" };
  }
  const next = lines.slice(key + 1).find(significant);
  const item = next ? /^(\s*)- /.exec(next) : null; // the list may sit at the key's own indent
  if (next && /^\s/.test(next) && !item) return { ok: false, reason: "the default branch's .gitlab-ci.yml has an include: that is not a list; Afterlife will not rewrite it" };
  const added = gapBlock(b, item?.[1] ?? '  ', false);
  return { ok: true, content: [...lines.slice(0, key + 1), ...added, ...lines.slice(key + 1)].join('\n'), added, after: key + 1 };
}

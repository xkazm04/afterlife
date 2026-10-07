// The arm block: the lines an arm MR adds to .gitlab-ci.yml, between two marker comments. The begin marker carries a
// digest of the lines between them, so a disarm removes exactly what the arm added, and refuses if anyone edited it
// since. Pure text: the file around the block is never re-serialised, so its comments and layout stay as they are.
import { createHash } from 'node:crypto';
import type { ArmPin, Include, TrackArm } from './content';

const digest = (lines: readonly string[]): string => createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 12);
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const beginRe = (a: TrackArm) => new RegExp(`^(\\s*)# belay:arm ${esc(a.track)} ${esc(a.key)} begin ([0-9a-f]{12})\\s*$`);
const endRe = (a: TrackArm) => new RegExp(`^\\s*# belay:arm ${esc(a.track)} ${esc(a.key)} end\\s*$`);

/** One YAML scalar: plain when it cannot be read as anything but that string, else single-quoted. */
export function scalar(v: string | number): string {
  if (typeof v === 'number') return String(v);
  return /^[A-Za-z][A-Za-z0-9._/-]*$/.test(v) && !/^(true|false|null|yes|no|on|off|y|n)$/i.test(v) ? v : `'${v.replace(/'/g, "''")}'`;
}

/** The include address of one belay-pack component, as the example writes it. */
export const componentAddress = (group: string, pin: ArmPin, name: string): string => `$CI_SERVER_FQDN/${group}/belay-pack/${name}@${pin.packVersion}`;

function items(includes: readonly Include[], group: string, pin: ArmPin, ind: string): string[] {
  return includes.flatMap((i) => [
    `${ind}- component: ${componentAddress(group, pin, i.component)}`,
    `${ind}  inputs:`,
    ...i.inputs.map(([k, v]) => `${ind}    ${k}: ${scalar(v)}`),
  ]);
}

/** The block, with its markers, at an indent. `withKey` when the file has no include: yet (the block then brings it). */
export function armBlock(a: TrackArm, group: string, pin: ArmPin, ind: string, withKey: boolean): string[] {
  const body = withKey ? ['include:', ...items(a.includes(pin), group, pin, '  ')] : items(a.includes(pin), group, pin, ind);
  const at = withKey ? '' : ind;
  return [`${at}# belay:arm ${a.track} ${a.key} begin ${digest(body)}`, ...body, `${at}# belay:arm ${a.track} ${a.key} end`];
}

export type Inserted = { ok: true; content: string; added: string[]; after: number } | { ok: false; reason: string };

const significant = (l: string): boolean => l.trim() !== '' && !l.trim().startsWith('#');

/** Adds the block to the top-level include: list (or adds include: at the end). Refuses a layout it would have to rewrite. */
export function insertBlock(text: string, a: TrackArm, group: string, pin: ArmPin): Inserted {
  const lines = text.split('\n');
  const key = lines.findIndex((l) => /^include\s*:/.test(l));
  if (key < 0) {
    const tail = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
    const added = armBlock(a, group, pin, '', true);
    const out = [...lines.slice(0, tail), ...added, ''];
    return { ok: true, content: out.join('\n'), added, after: tail };
  }
  if (!/^include\s*:\s*(#.*)?$/.test(lines[key] ?? '')) {
    return { ok: false, reason: "main's .gitlab-ci.yml writes include: on one line; Belay adds to a block list only, so make it a list first" };
  }
  const next = lines.slice(key + 1).find(significant);
  const item = next ? /^(\s+)- /.exec(next) : null;
  if (next && /^\s/.test(next) && !item) return { ok: false, reason: "main's .gitlab-ci.yml has an include: that is not a list; Belay will not rewrite it" };
  const added = armBlock(a, group, pin, item?.[1] ?? '  ', false);
  const out = [...lines.slice(0, key + 1), ...added, ...lines.slice(key + 1)];
  return { ok: true, content: out.join('\n'), added, after: key + 1 };
}

export type Found =
  | { state: 'absent' }
  | { state: 'armed'; from: number; to: number }
  | { state: 'edited'; from: number };

/** Where the track's block is in the file, and whether its lines are still exactly the ones the arm added. */
export function findBlock(text: string, a: TrackArm): Found {
  const lines = text.split('\n');
  const from = lines.findIndex((l) => beginRe(a).test(l));
  if (from < 0) return { state: 'absent' };
  const to = lines.findIndex((l, i) => i > from && endRe(a).test(l));
  const want = beginRe(a).exec(lines[from] ?? '')?.[2];
  if (to < 0 || digest(lines.slice(from + 1, to)) !== want) return { state: 'edited', from };
  return { state: 'armed', from, to };
}

export type Removed = { ok: true; content: string; removed: string[]; from: number } | { ok: false; found: Found };

/** The file without the block: exactly the lines the arm added, markers included. */
export function removeBlock(text: string, a: TrackArm): Removed {
  const found = findBlock(text, a);
  if (found.state !== 'armed') return { ok: false, found };
  const lines = text.split('\n');
  return { ok: true, content: [...lines.slice(0, found.from), ...lines.slice(found.to + 1)].join('\n'), removed: lines.slice(found.from, found.to + 1), from: found.from };
}

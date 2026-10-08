// The Belay CI file the bootstrap adds, and the one include line that wires it into the project's own .gitlab-ci.yml.
// The project's file is only ever added to: a line is inserted or appended, never changed or removed.
import { parse as parseYaml } from 'yaml';

export const BELAY_CI = '.gitlab/belay.gitlab-ci.yml';
export const INCLUDE_LINE = `local: ${BELAY_CI}`;

export interface PackRef {
  /** The group's root namespace, where belay-pack and belay-engine live. */
  group: string;
  packVersion: string;
  engineRef: string;
}

/** The components every paired project runs: the proofs, the gate, the tripwire, the ledger and the weekly scan. */
export function belayCi({ group, packVersion, engineRef }: PackRef): string {
  const c = (name: string) => `$CI_SERVER_FQDN/${group}/belay-pack/${name}@${packVersion}`;
  const proof = (cls: string) => [`  - component: ${c('proof-engine')}`, `    inputs: { class: ${cls}, engine_ref: ${engineRef}, stage: test }`];
  return [
    '# Belay: the proof jobs, the tier gate, the tripwire, the ledger and the maturity scan (written by `belay pair`).',
    '# Belay holds no merge token: these jobs approve, wait or block; a person merges. Pin engine_commit for a release.',
    'include:',
    ...proof('exploit-test'),
    ...proof('cited-diff'),
    ...proof('rerun-stats'),
    `  - component: ${c('tier-gate')}`,
    `    inputs: { engine_ref: ${engineRef} }`,
    `  - component: ${c('tripwire')}`,
    `    inputs: { engine_ref: ${engineRef} }`,
    `  - component: ${c('ledger-append')}`,
    `    inputs: { engine_ref: ${engineRef} }`,
    `  - component: ${c('maturity-scan')}`,
    `    inputs: { engine_ref: ${engineRef} }`,
    '',
  ].join('\n');
}

type Doc = Record<string, unknown>;
const parse = (text: string): Doc | null => {
  try {
    const v = parseYaml(text, { logLevel: 'error', customTags: [{ tag: '!reference', collection: 'seq', resolve: (x) => x }] }) as unknown;
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Doc) : v == null ? {} : null;
  } catch {
    return null;
  }
};
const includes = (d: Doc): unknown[] => (Array.isArray(d.include) ? d.include : d.include === undefined ? [] : [d.include]);
const wired = (d: Doc): boolean => includes(d).some((i) => i === BELAY_CI || (typeof i === 'object' && i !== null && (i as Doc).local === BELAY_CI));

export type CiEdit = { op: 'create' | 'insert' | 'append'; text: string } | { op: 'keep' } | { op: 'refuse'; why: string };

/**
 * Wires the Belay file into `.gitlab-ci.yml` by adding one include entry: a new file; a new `include:` block at the end;
 * or one list item inserted under an existing block-style `include:`. The result must parse, keep every other key as it
 * was, and include the Belay file; otherwise it is refused and the operator adds the line by hand.
 */
export function wireCi(current: string | null): CiEdit {
  if (current === null) return { op: 'create', text: `include:\n  - ${INCLUDE_LINE}\n` };
  const before = parse(current);
  if (!before) return { op: 'refuse', why: '.gitlab-ci.yml does not parse as YAML' };
  if (wired(before)) return { op: 'keep' };
  let edit: CiEdit;
  if (before.include === undefined) {
    edit = { op: 'append', text: `${current}${current.endsWith('\n') || current === '' ? '' : '\n'}\ninclude:\n  - ${INCLUDE_LINE}\n` };
  } else {
    const lines = current.split('\n');
    const at = lines.findIndex((l) => /^include:\s*(#.*)?$/.test(l));
    const item = at >= 0 ? lines.slice(at + 1).find((l) => l.trim() !== '' && !l.trim().startsWith('#')) : undefined;
    const indent = item?.match(/^(\s*)- /)?.[1];
    if (at < 0 || indent === undefined) return { op: 'refuse', why: `include: is not a block list; add "- ${INCLUDE_LINE}" to it yourself` };
    edit = { op: 'insert', text: [...lines.slice(0, at + 1), `${indent}- ${INCLUDE_LINE}`, ...lines.slice(at + 1)].join('\n') };
  }
  const after = parse(edit.text);
  const same = (a: Doc, b: Doc) => JSON.stringify({ ...a, include: null }) === JSON.stringify({ ...b, include: null });
  if (!after || !wired(after) || !same(before, after) || includes(after).length !== includes(before).length + 1) {
    return { op: 'refuse', why: `the edit would not keep .gitlab-ci.yml as it is; add "- ${INCLUDE_LINE}" under include: yourself` };
  }
  return edit;
}

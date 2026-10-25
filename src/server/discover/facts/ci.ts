// The CI definitions of a repo, as the few lines a variant rule is decided from: which branches and schedules trigger
// each pipeline, its run parameters, its stage names, the output variables it sets (Azure's LANE=hotfix) and the commit
// markers its comments name ([hotfix], [full-suite]). Read with string scans, not a YAML parser: Azure templates carry
// `${{ }}` expressions that are not YAML a parser keeps, and only these few lines matter.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface CiFileFacts {
  path: string;
  blocks: Record<string, string>;
  parameters: string[];
  stages: string[];
  /** Output variables the pipeline sets (`##vso[task.setvariable variable=X]`), with the values seen assigned. */
  variables: Record<string, string[]>;
  /** `[word]` markers its comments name. */
  markers: string[];
}

const BLOCK_LINES = 40;
const TRIGGERS = ['trigger', 'pr', 'schedules', 'on', 'workflow'];

/** The CI files at the places the three providers look: Azure's root file and pipelines/, GitLab's, GitHub's. */
export function ciFiles(root: string): string[] {
  const out: string[] = [];
  const at = (rel: string) => existsSync(path.join(root, rel)) && out.push(rel);
  at('azure-pipelines.yml');
  at('.gitlab-ci.yml');
  for (const dir of ['pipelines', '.azure-pipelines', '.github/workflows']) {
    try {
      for (const f of readdirSync(path.join(root, dir)).sort()) if (/\.ya?ml$/i.test(f)) out.push(`${dir}/${f}`);
    } catch {
      /* no such dir */
    }
  }
  return out;
}

/** A top-level `key:` block, up to the next top-level key, cut to BLOCK_LINES. */
function block(lines: readonly string[], key: string): string | undefined {
  const start = lines.findIndex((l) => l.startsWith(`${key}:`));
  if (start < 0) return undefined;
  const body = [lines[start] ?? ''];
  for (let i = start + 1; i < lines.length && body.length < BLOCK_LINES; i++) {
    const l = lines[i] ?? '';
    if (/^[A-Za-z_"'][^:]*:/.test(l)) break;
    if (l.trim() && !l.trim().startsWith('#')) body.push(l.replace(/\s+#.*$/, ''));
  }
  return body.join('\n');
}

/** The `- name:` entries one indent under a top-level `parameters:`. */
function parameterNames(lines: readonly string[]): string[] {
  const start = lines.findIndex((l) => /^parameters:\s*$/.test(l));
  if (start < 0) return [];
  const names: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i] ?? '';
    if (/^\S/.test(l) && !l.startsWith('#')) break;
    const m = /^\s{0,4}-\s+name:\s*['"]?([\w.-]+)/.exec(l);
    if (m?.[1]) names.push(m[1]);
  }
  return names;
}

export function ciFacts(root: string, rel: string): CiFileFacts {
  const text = readFileSync(path.join(root, rel), 'utf8');
  const lines = text.split(/\r?\n/);
  const blocks: Record<string, string> = {};
  for (const k of TRIGGERS) {
    const b = block(lines, k);
    if (b) blocks[k] = b;
  }
  const stages = [...new Set([...text.matchAll(/^\s*-\s+stage:\s*['"]?([\w.-]+)/gm)].map((m) => m[1] ?? ''))].filter(Boolean).slice(0, 20);
  const variables: Record<string, string[]> = {};
  for (const m of text.matchAll(/task\.setvariable variable=(\w+)/g)) {
    const name = m[1] ?? '';
    if (!name || variables[name]) continue;
    const seen = [...text.matchAll(new RegExp(`\\b${name}=["']?([\\w.-]+)`, 'g'))].map((v) => v[1] ?? '').filter((v) => v && !v.startsWith('$'));
    variables[name] = [...new Set(seen)].slice(0, 5);
  }
  const markers = [...new Set(lines.filter((l) => l.trim().startsWith('#')).flatMap((l) => [...l.matchAll(/`?\[([a-z][a-z-]{2,20})\]`?/g)].map((m) => m[1] ?? '')))].slice(0, 10);
  return { path: rel, blocks, parameters: parameterNames(lines), stages, variables: Object.fromEntries(Object.entries(variables).slice(0, 10)), markers };
}

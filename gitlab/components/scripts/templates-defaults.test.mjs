// F30: a template's belay-* project defaults (wire names) follow the target's own namespace, never the top-level group.
import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseAllDocuments } from 'yaml';

const dir = path.resolve(import.meta.dirname, '../templates');
const INPUTS = ['engine_project', 'policy_project', 'ledger_project'];

for (const name of fs.readdirSync(dir)) {
  const file = path.join(dir, name, 'template.yml');
  if (!fs.existsSync(file)) continue;
  it(`${name}: project defaults do not name $CI_PROJECT_ROOT_NAMESPACE`, () => {
    const spec = parseAllDocuments(fs.readFileSync(file, 'utf8'))[0].toJS().spec.inputs;
    for (const k of INPUTS) {
      if (!(k in spec)) continue;
      expect(spec[k], `${k} keeps a default`).toHaveProperty('default');
      expect(String(spec[k].default), `${k} default`).not.toMatch(/CI_PROJECT_ROOT_NAMESPACE/);
    }
  });
}

// M6 / F100: a pipeline variable (trigger, API, manual run) outranks a job's own `variables:`, so nothing that picks the
// engine, its pin, glab, the policy (project and ref) or the shell run beside CI_JOB_TOKEN may be a job variable: it is read
// from `$[[ inputs.x ]]`. Nor may the accounts whose Proof Block, guardrail or medic note a job trusts.
const PINNED = ['AFTERLIFE_ENGINE_PROJECT', 'AFTERLIFE_ENGINE_REF', 'AFTERLIFE_ENGINE_COMMIT', 'AFTERLIFE_POLICY_PROJECT', 'AFTERLIFE_POLICY_REF', 'AFTERLIFE_GLAB_VERSION', 'AFTERLIFE_GLAB_SHA256', 'AFTERLIFE_BUILD_ARGS', 'AFTERLIFE_PREPARE',
  'AFTERLIFE_PROOF_AUTHORS', 'AFTERLIFE_GUARDRAIL_AUTHORS', 'AFTERLIFE_BLOCK_AUTHORS',
  'AFTERLIFE_AGENT_PREFIX', 'AFTERLIFE_CLASS', 'AFTERLIFE_CLASS_INPUT', 'AFTERLIFE_EVIDENCE_MODE', 'AFTERLIFE_EVIDENCE_FILE', 'AFTERLIFE_POST_MERGE', 'AFTERLIFE_EMIT'];
const GUARDED = ['engine_project', 'engine_ref', 'engine_commit', 'policy_project', 'policy_ref', 'glab_version', 'glab_sha256', 'build_args',
  'proof_authors', 'guardrail_authors', 'block_authors', 'agent_prefix', 'evidence_file'];
const READ = ['class', 'evidence_mode', 'post_merge', 'emit_events']; // options- or type-guarded: read in the shell, no regex needed

for (const name of fs.readdirSync(dir)) {
  const file = path.join(dir, name, 'template.yml');
  if (!fs.existsSync(file)) continue;
  const docs = parseAllDocuments(fs.readFileSync(file, 'utf8'));
  const spec = docs[0].toJS().spec.inputs;
  const jobs = docs[1].toJS();

  it(`${name}: parses, and no job variable picks the engine, its pin, glab, the policy or the shell`, () => {
    for (const d of docs) expect(d.errors, 'yaml errors').toEqual([]);
    for (const [job, def] of Object.entries(jobs)) {
      for (const k of PINNED) expect(def.variables ?? {}, `${job} ${k}`).not.toHaveProperty(k);
    }
    const shell = Object.values(jobs).flatMap((j) => [...(j.before_script ?? []), ...(j.script ?? [])]).join('\n');
    for (const k of [...GUARDED, ...READ].filter((g) => g in spec && g !== 'build_args')) expect(shell, k).toContain(`$[[ inputs.${k} ]]`);
    if ('prepare_script' in spec) expect(shell).toContain('$[[ inputs.prepare_script ]]');
  });

  it(`${name}: every guarded input carries a regex its default passes`, () => {
    for (const k of GUARDED.filter((g) => g in spec)) {
      expect(spec[k], `${k} regex`).toHaveProperty('regex');
      if ('default' in spec[k]) expect(new RegExp(spec[k].regex).test(String(spec[k].default)), `${k} default`).toBe(true);
    }
  });
}

it('proof-engine: build_args keeps its documented example and refuses shell metacharacters', () => {
  const spec = parseAllDocuments(fs.readFileSync(path.join(dir, 'proof-engine', 'template.yml'), 'utf8'))[0].toJS().spec.inputs;
  const re = new RegExp(spec.build_args.regex);
  const example = /"(--base-junit[^"]*)"/.exec(spec.build_args.description)?.[1] ?? '';
  expect(example).not.toBe('');
  expect(re.test(example)).toBe(true);
  expect(re.test('--base-ref https://gitlab.example.com/g/p/-/jobs/1/artifacts/raw/x.xml')).toBe(true);
  for (const bad of ["a'; id", 'a; id', '$(id)', '`id`', 'a | b', 'a && b', 'a\nb']) expect(re.test(bad), JSON.stringify(bad)).toBe(false);
});

it('every ref and checksum input refuses shell metacharacters', () => {
  const ref = new RegExp('^[A-Za-z0-9][A-Za-z0-9._/-]*$');
  for (const bad of ["v1'; id", '-upload-pack=x', '$(id)']) expect(ref.test(bad)).toBe(false);
  for (const name of ['proof-engine', 'tier-gate']) {
    const spec = parseAllDocuments(fs.readFileSync(path.join(dir, name, 'template.yml'), 'utf8'))[0].toJS().spec.inputs;
    expect(new RegExp(spec.glab_sha256.regex).test(''), `${name} refuses an empty checksum`).toBe(false);
    expect(new RegExp(spec.engine_commit.regex).test('main')).toBe(false);
  }
});

// M6: tier-gate's `$(( ... AFTERLIFE_WAIT_MINUTES * 60 ))` evaluates the variable's text as an expression, and bash runs a
// `$(...)` inside an array subscript there, so the wait is a number input read in the shell, never a job variable.
it('tier-gate: wait_minutes is a number input, read in the shell, not a job variable the arithmetic would evaluate', () => {
  const docs = parseAllDocuments(fs.readFileSync(path.join(dir, 'tier-gate', 'template.yml'), 'utf8'));
  expect(docs[0].toJS().spec.inputs.wait_minutes.type).toBe('number');
  const job = docs[1].toJS()['belay-tier-gate'];
  expect(job.variables ?? {}).not.toHaveProperty('AFTERLIFE_WAIT_MINUTES');
  expect(job.script.join('\n')).toMatch(/AFTERLIFE_WAIT_MINUTES=\$\[\[ inputs\.wait_minutes \]\]/);
});

// The rename's deprecation window: a template's shell names AFTERLIFE_*, and a pre-rename BELAY_* name appears only paired
// with its AFTERLIFE_* twin on the same line (set both, or read AFTERLIFE first), or in the unset before mr.env is sourced.
// An engine_ref pinned before the rename reads BELAY_DIR and its siblings, and its mr-context writes only BELAY_* names.
for (const name of fs.readdirSync(dir)) {
  const file = path.join(dir, name, 'template.yml');
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  it(`${name}: every BELAY_ name is paired with its AFTERLIFE_ name`, () => {
    for (const line of lines.filter((l) => /BELAY_/.test(l) && !/^\s*unset /.test(l))) {
      for (const [, key] of line.matchAll(/BELAY_([A-Z0-9_]+)/g)) expect(line, `${name}: BELAY_${key}`).toContain(`AFTERLIFE_${key}`);
    }
    expect(lines.join('\n')).toMatch(/export BELAY_DIR="\$AFTERLIFE_DIR" BELAY_GLUE="\$AFTERLIFE_GLUE"/);
  });
  if (lines.some((l) => l.includes('. ./.belay/mr.env'))) {
    it(`${name}: reads each mr.env value under AFTERLIFE_, falling back to the BELAY_ an older engine writes`, () => {
      for (const k of ['MR_IID', 'TASK_ID', 'ACTION_CLASS', 'AGENT', 'BASE_SHA', 'HEAD_SHA']) {
        expect(lines.join('\n'), k).toContain(`AFTERLIFE_${k}="\${AFTERLIFE_${k}:-$BELAY_${k}}"`);
      }
    });
  }
}

// The same, run: tier-gate's mr.env lines in sh, against the file an engine before the rename writes (BELAY_* only) and the
// one mr-context writes now (both), with a pipeline variable of the new name that must not stand in for the file's value.
it('tier-gate: an mr.env of either engine yields the file\'s values under AFTERLIFE_, never a pipeline variable\'s', () => {
  const lines = fs.readFileSync(path.join(dir, 'tier-gate', 'template.yml'), 'utf8').split('\n');
  const from = lines.findIndex((l) => l.includes('unset AFTERLIFE_MR_IID'));
  const to = lines.findIndex((l) => l.includes('AFTERLIFE_HEAD_SHA="${AFTERLIFE_HEAD_SHA:-$BELAY_HEAD_SHA}"'));
  expect(from).toBeGreaterThan(-1);
  const snippet = ['set -eu', ...lines.slice(from, to + 1).map((l) => l.trim()), 'echo "$AFTERLIFE_MR_IID $AFTERLIFE_ACTION_CLASS $AFTERLIFE_HEAD_SHA"'].join('\n');
  const values = { MR_IID: '7', TASK_ID: 'T', ACTION_CLASS: 'code-fix.patch', AGENT: 'ai-patcher', BASE_SHA: 'b'.repeat(40), HEAD_SHA: 'c'.repeat(40) };
  for (const names of [['BELAY'], ['AFTERLIFE', 'BELAY']]) {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'afterlife-mrenv-'));
    fs.mkdirSync(path.join(cwd, '.belay'));
    fs.writeFileSync(path.join(cwd, '.belay', 'mr.env'), names.flatMap((n) => Object.entries(values).map(([k, v]) => `${n}_${k}=${v}\n`)).join(''));
    const r = spawnSync('sh', ['-c', snippet], { cwd, encoding: 'utf8', env: { PATH: process.env.PATH, AFTERLIFE_HEAD_SHA: 'e'.repeat(40) } });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout.trim(), names.join('+')).toBe(`7 code-fix.patch ${'c'.repeat(40)}`);
    fs.rmSync(cwd, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

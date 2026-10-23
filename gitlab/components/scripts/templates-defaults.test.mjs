// F30: a template's belay-* project defaults follow the target's own namespace, never the top-level group.
import { expect, it } from 'vitest';
import fs from 'node:fs';
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
const PINNED = ['BELAY_ENGINE_PROJECT', 'BELAY_ENGINE_REF', 'BELAY_ENGINE_COMMIT', 'BELAY_POLICY_PROJECT', 'BELAY_POLICY_REF', 'BELAY_GLAB_VERSION', 'BELAY_GLAB_SHA256', 'BELAY_BUILD_ARGS', 'BELAY_PREPARE',
  'BELAY_PROOF_AUTHORS', 'BELAY_GUARDRAIL_AUTHORS', 'BELAY_BLOCK_AUTHORS'];
const GUARDED = ['engine_project', 'engine_ref', 'engine_commit', 'policy_project', 'policy_ref', 'glab_version', 'glab_sha256', 'build_args',
  'proof_authors', 'guardrail_authors', 'block_authors'];

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
    for (const k of GUARDED.filter((g) => g in spec && g !== 'build_args')) expect(shell, k).toContain(`$[[ inputs.${k} ]]`);
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

// M6: tier-gate's `$(( ... BELAY_WAIT_MINUTES * 60 ))` evaluates the variable's text as an expression, and bash runs a
// `$(...)` inside an array subscript there, so the wait is a number input read in the shell, never a job variable.
it('tier-gate: wait_minutes is a number input, read in the shell, not a job variable the arithmetic would evaluate', () => {
  const docs = parseAllDocuments(fs.readFileSync(path.join(dir, 'tier-gate', 'template.yml'), 'utf8'));
  expect(docs[0].toJS().spec.inputs.wait_minutes.type).toBe('number');
  const job = docs[1].toJS()['belay-tier-gate'];
  expect(job.variables ?? {}).not.toHaveProperty('BELAY_WAIT_MINUTES');
  expect(job.script.join('\n')).toMatch(/BELAY_WAIT_MINUTES=\$\[\[ inputs\.wait_minutes \]\]/);
});

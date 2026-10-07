// F4: no job of a target pipeline can read a write-capable token. The target example is expanded with every belay-pack
// component it includes (inputs interpolated, defaults filled in), and no part of it, nor any belay-pack template a target
// could include, names a write token. GITLAB_TOKEN may only ever come from CI_JOB_TOKEN. Every write is belay-apply's
// (gitlab/apply), which holds the tokens on its own protected branch.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse, parseAllDocuments } from 'yaml';
import { ROOT } from './testing/harness.mjs';

const WRITE_TOKENS = ['BELAY_BOT_TOKEN', 'BELAY_POLICY_TOKEN', 'BELAY_LEDGER_TOKEN', 'BELAY_DISPATCH_TOKEN'];
const TEMPLATES = path.join(ROOT, 'gitlab/components/templates');
const EXAMPLE = path.join(ROOT, 'gitlab/examples/target-project/.gitlab-ci.yml');

/** A template's jobs as a target gets them: `$[[ inputs.x ]]` replaced by the include's value or the input's default. */
function expand(name, given) {
  const text = fs.readFileSync(path.join(TEMPLATES, name, 'template.yml'), 'utf8');
  const [specDoc] = parseAllDocuments(text);
  const spec = specDoc.toJS().spec.inputs;
  const body = text.slice(text.indexOf('\n---\n') + 5);
  const filled = body.replace(/\$\[\[\s*inputs\.([a-z_]+)\s*\]\]/g, (_, k) => {
    const v = k in given ? given[k] : spec[k]?.default;
    if (v === undefined) throw new Error(`${name}: input ${k} has no value`);
    return Array.isArray(v) ? JSON.stringify(v) : String(v);
  });
  return { text, jobs: parse(filled) };
}

/** Every job of the target pipeline (hidden templates too), by name, with the file it came from. */
function targetPipeline() {
  const example = parse(fs.readFileSync(EXAMPLE, 'utf8'));
  const jobs = [];
  const files = [{ file: EXAMPLE, text: fs.readFileSync(EXAMPLE, 'utf8') }];
  for (const [name, job] of Object.entries(example)) {
    if (!['stages', 'workflow', 'include', 'variables', 'default'].includes(name)) jobs.push({ name, job, from: 'example' });
  }
  if (example.variables) jobs.push({ name: '(global variables)', job: { variables: example.variables }, from: 'example' });
  for (const inc of example.include ?? []) {
    const m = /\/belay-pack\/([a-z-]+)@/.exec(String(inc.component ?? ''));
    if (!m) continue;
    const { text, jobs: got } = expand(m[1], inc.inputs ?? {});
    files.push({ file: m[1], text });
    for (const [name, job] of Object.entries(got)) jobs.push({ name, job, from: m[1] });
  }
  return { jobs, files };
}

/** Each place a job sets GITLAB_TOKEN: a shell assignment or export, or a `variables:` entry. */
function gitlabTokenSources(job) {
  const text = JSON.stringify(job).replaceAll('\\"', '"').replaceAll('\\n', '\n');
  const out = [...text.matchAll(/GITLAB_TOKEN=("?\$\{?[A-Za-z_]+\}?"?|\S+)/g)].map((m) => m[1]);
  for (const [k, v] of Object.entries(job?.variables ?? {})) if (k === 'GITLAB_TOKEN') out.push(String(v));
  return out;
}

const fromJobToken = (src) => /^"?\$\{?CI_JOB_TOKEN\}?"?$/.test(src);

describe('the target pipeline (F4)', () => {
  const { jobs, files } = targetPipeline();

  it('includes belay-pack components, so the expansion is not empty', () => {
    expect(jobs.filter((j) => j.from !== 'example').length).toBeGreaterThan(0);
  });

  it.each(WRITE_TOKENS)('names %s nowhere: not in the example, not in a component it includes', (token) => {
    for (const f of files) expect(f.text, `${path.basename(f.file)} names ${token}`).not.toContain(token);
    for (const j of jobs) expect(JSON.stringify(j.job), `${j.from}: job ${j.name} names ${token}`).not.toContain(token);
  });

  it('sets GITLAB_TOKEN from CI_JOB_TOKEN and nothing else', () => {
    for (const j of jobs) {
      for (const src of gitlabTokenSources(j.job)) expect(fromJobToken(src), `${j.from}: job ${j.name} sets GITLAB_TOKEN from ${src}`).toBe(true);
    }
  });

  it('every belay-pack template a target could include names no write token either', () => {
    for (const name of fs.readdirSync(TEMPLATES)) {
      const file = path.join(TEMPLATES, name, 'template.yml');
      if (!fs.existsSync(file)) continue;
      const text = fs.readFileSync(file, 'utf8');
      for (const token of WRITE_TOKENS) expect(text, `${name} names ${token}`).not.toContain(token);
      for (const src of gitlabTokenSources(text)) expect(fromJobToken(src), `${name} sets GITLAB_TOKEN from ${src}`).toBe(true);
    }
  });
});

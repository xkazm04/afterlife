// The fixture every belay-apply sweep test shares: a fake glab answering as the paired group, a real git clone of
// belay-policy and the real engine. Each test file calls rig() once, so it owns its workdir, its POLICY clone and its
// apply.json, and the four sweep files run side by side instead of one after another.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll } from 'vitest';
import { ROOT, runScript, workdir } from '../../components/scripts/testing/harness.mjs';


export const BASE = 'b'.repeat(40);
export const HEAD = 'a'.repeat(40);
export const OLD = 'c'.repeat(40);
export const URL_ = 'https://gitlab.example/acme/ledgerline';
export const FIX = path.join(ROOT, 'engine/__fixtures__/exploit');
export const fixture = (f) => fs.readFileSync(path.join(FIX, f), 'utf8');
export const LEDGER = `projects/${encodeURIComponent('acme/belay-ledger')}`;
export const POLICY_API = `projects/${encodeURIComponent('acme/belay-policy')}`;
export const STATE = 'version: 1\npolicy_sha: a1b2c3\nagents:\n  ai-patcher-acme:\n    code-fix.patch: { tier: supervised, since: "2026-10-01", by: "start tier + record" }\n';

const git = (cwd, ...args) => execFileSync('git', ['-c', 'core.autocrlf=false', '-C', cwd, ...args], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@x', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@x' } });

/** fix.diff as the compare API returns it: one entry per file, the hunks from the first @@. */
export const compareOf = (diff) => ({
  diffs: diff.split(/^(?=diff --git )/m).filter(Boolean).map((chunk) => {
    const from = /^--- (?:a\/)?(.+)$/m.exec(chunk)[1];
    const to = /^\+\+\+ (?:b\/)?(.+)$/m.exec(chunk)[1];
    return { old_path: from === '/dev/null' ? to : from, new_path: to, new_file: from === '/dev/null', deleted_file: false, renamed_file: false, diff: chunk.slice(chunk.indexOf('@@')) };
  }),
});

export const claims = {
  schema: 'belay.claims/1', task: '01J9ZP6M2Q8E4V7K3N5R1T0XAB', class: 'code-fix.patch',
  finding: { id: 'GL-SAST-4417', severity: 'high', vector: 'path traversal in the statement export endpoint' },
  test: { id: 'StatementExportTraversalTest', path: 'statements/src/test/kotlin/io/ledgerline/statements/StatementExportTraversalTest.kt', command: 'gradle test', markers: ['../../../etc/passwd', 'path traversal'] },
  claims: [
    { id: 'base-red', text: 'StatementExportTraversalTest fails at base and names the ../../../etc/passwd vector' },
    { id: 'head-green', text: 'The same test passes at head' },
    { id: 'test-not-weakened', text: 'No existing test was weakened' },
    { id: 'finding-closed', text: 'Finding GL-SAST-4417 is closed on rescan' },
  ],
};
export const description = `Fix the export traversal\n\n\`\`\`belay-claims\n${JSON.stringify(claims)}\n\`\`\`\n\nBelay-Task: 01J9ZP6M2Q8E4V7K3N5R1T0XAB\nBelay-Class: code-fix.patch`;
export const guardrailNote = (verdict, head = HEAD, findings = []) => ({
  id: 50, system: false, author: { username: 'ai-guardrail-acme' }, created_at: '2026-10-07T10:00:00Z',
  body: `Guardrail\n\n\`\`\`belay-guardrail\n${JSON.stringify({ schema: 'belay.guardrail/1', verdict, head_sha: head, findings })}\n\`\`\``,
});
export const scan = (ids) => ({ __raw: JSON.stringify({ engine_version: 'semgrep-sast 5.41.0', finding_ids: ids }) });
export const ART = 'projects/1/jobs/9001/artifacts';

/** The group as GitLab answers. Every option is one fact a case changes. */
export function group({ desc = description, notes = [guardrailNote('pass')], pipelineSha = HEAD, diff = fixture('fix.diff'), labels = [], baseJunit = fixture('base.junit.xml'), extra = {}, ledgerCommits = [], state = STATE } = {}) {
  return {
    'groups/acme/projects': [
      { id: 1, path_with_namespace: 'acme/ledgerline', web_url: URL_, default_branch: 'main' },
      { id: 2, path_with_namespace: 'other/shared', web_url: 'https://gitlab.example/other/shared', default_branch: 'main' },
    ],
    'projects/1': { id: 1, path_with_namespace: 'acme/ledgerline', web_url: URL_, default_branch: 'main', ci_config_path: null },
    'projects/1/merge_requests': [{ iid: 7, author: { username: 'ai-patcher-acme' } }],
    'projects/1/merge_requests/7': { iid: 7, author: { username: 'ai-patcher-acme' }, description: desc, target_branch: 'main', sha: HEAD, diff_refs: { base_sha: BASE, head_sha: HEAD }, labels },
    'projects/1/merge_requests/7/notes': notes,
    'projects/1/merge_requests/7/approvals': { approved_by: [] },
    'projects/1/repository/compare': compareOf(diff),
    'projects/1/repository/files/.gitlab-ci.yml/raw': { __raw: 'stages: [build, test, review]\ninclude:\n  - local: /ci/replay.yml\n' },
    'projects/1/repository/files/ci%2Freplay.yml/raw': { __raw: 'belay-replay:\n  script: ./gradlew test\n' },
    'projects/1/merge_requests/7/pipelines': [{ id: 500, sha: pipelineSha, status: 'success', source: 'merge_request_event' }],
    'projects/1/pipelines/500': { id: 500, sha: pipelineSha, status: 'success', source: 'merge_request_event' },
    'projects/1/pipelines/500/variables': [],
    'projects/1/pipelines/500/jobs': [
      { id: 9001, name: 'belay-replay', status: 'success', web_url: `${URL_}/-/jobs/9001` },
      { id: 9002, name: 'belay-proof-exploit-test', status: 'success', web_url: `${URL_}/-/jobs/9002` },
    ],
    [`${ART}/evidence/base/junit.xml`]: { __raw: baseJunit },
    [`${ART}/evidence/head/junit.xml`]: { __raw: fixture('head.junit.xml') },
    [`${ART}/evidence/base/scan.json`]: scan(['GL-SAST-4417', 'GL-SAST-4102']),
    [`${ART}/evidence/head/scan.json`]: scan(['GL-SAST-4102']),
    [`${POLICY_API}/repository/files/tier-state.yml`]: { file_path: 'tier-state.yml', encoding: 'base64', content: Buffer.from(state).toString('base64'), last_commit_id: '1'.repeat(40) },
    [`${LEDGER}/repository/commits`]: ledgerCommits,
    [`${LEDGER}/repository/files/events%2F1.jsonl`]: { __http: 404, message: '404 File Not Found' },
    [`POST ${LEDGER}/repository/commits`]: { reply: { id: 'f'.repeat(40) } },
    ...extra,
  };
}

export const TOKENS = { BELAY_BOT_TOKEN: 'bot', BELAY_LEDGER_TOKEN: 'ledger', CI_SERVER_FQDN: 'gitlab.example' };
export const glabWrites = (r, cmd) => r.writes.filter((w) => w.method === 'GLAB' && w.path === `mr ${cmd}`);
export const proofOf = (note) => JSON.parse(/```belay-proof\n([\s\S]*?)\n```/.exec(note.body.message)[1]);
export const granted = (r) => r.writes.filter((w) => w.path === 'mr approve' || w.path === 'mr merge');

/** One file's sweep: its own workdir (removed after the file), POLICY clone and apply.json. */
export function rig(prefix) {
  const dir = workdir(prefix);
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));
  // belay-policy as a repository the sweep clones (file://, so --depth works).
  const p = path.join(dir, 'belay-policy');
  fs.mkdirSync(p);
  git(p, 'init', '-q', '-b', 'main');
  fs.copyFileSync(path.join(ROOT, 'policy', 'trust-policy.yml'), path.join(p, 'trust-policy.yml'));
  fs.writeFileSync(path.join(p, 'tier-state.yml'), STATE);
  git(p, 'add', '.');
  git(p, 'commit', '-q', '-m', 'seed');
  const POLICY = pathToFileURL(p).href;
  const CONFIG = path.join(dir, 'apply.json');
  fs.writeFileSync(CONFIG, JSON.stringify({
    group: 'acme',
    policy: { project: 'acme/belay-policy', branch: 'main' },
    ledger: { project: 'acme/belay-ledger', branch: 'main' },
    bot: 'belay-bot',
    guardrail_authors: 'ai-guardrail-acme',
    targets: { 'acme/ledgerline': {}, 'other/shared': {} },
  }));
  const sweep = (routes, env = TOKENS) => runScript(dir, '../../apply/sweep.mjs', ['--config', CONFIG, '--policy-remote', POLICY, '--work', path.join(dir, 'work')], { routes, env });
  return { dir, POLICY, CONFIG, sweep };
}

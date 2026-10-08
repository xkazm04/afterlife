// belay-apply's MR sweep end to end: a fake glab answering as the paired group, a real git clone of belay-policy and the
// real engine. It re-derives the proof from the evidence job's artifacts, runs the gate itself, and writes only through the
// components' own scripts; a second sweep writes nothing. Each case is one of F4's invariants (gitlab/apply/README.md).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { ROOT, runScript, workdir } from '../components/scripts/testing/harness.mjs';

const dir = workdir('apply');
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const BASE = 'b'.repeat(40);
const HEAD = 'a'.repeat(40);
const OLD = 'c'.repeat(40);
const URL_ = 'https://gitlab.example/acme/ledgerline';
const FIX = path.join(ROOT, 'engine/__fixtures__/exploit');
const fixture = (f) => fs.readFileSync(path.join(FIX, f), 'utf8');
const LEDGER = `projects/${encodeURIComponent('acme/belay-ledger')}`;
const POLICY_API = `projects/${encodeURIComponent('acme/belay-policy')}`;
const STATE = 'version: 1\npolicy_sha: a1b2c3\nagents:\n  ai-patcher-acme:\n    code-fix.patch: { tier: supervised, since: "2026-10-01", by: "start tier + record" }\n';

const git = (cwd, ...args) => execFileSync('git', ['-c', 'core.autocrlf=false', '-C', cwd, ...args], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@x', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@x' } });

/** belay-policy as a repository the sweep clones (file://, so --depth works). */
const POLICY = (() => {
  const p = path.join(dir, 'belay-policy');
  fs.mkdirSync(p);
  git(p, 'init', '-q', '-b', 'main');
  fs.copyFileSync(path.join(ROOT, 'policy', 'trust-policy.yml'), path.join(p, 'trust-policy.yml'));
  fs.writeFileSync(path.join(p, 'tier-state.yml'), STATE);
  git(p, 'add', '.');
  git(p, 'commit', '-q', '-m', 'seed');
  return pathToFileURL(p).href;
})();

const CONFIG = path.join(dir, 'apply.json');
fs.writeFileSync(CONFIG, JSON.stringify({
  group: 'acme',
  policy: { project: 'acme/belay-policy', branch: 'main' },
  ledger: { project: 'acme/belay-ledger', branch: 'main' },
  bot: 'belay-bot',
  guardrail_authors: 'ai-guardrail-acme',
  targets: { 'acme/ledgerline': {}, 'other/shared': {} },
}));

/** fix.diff as the compare API returns it: one entry per file, the hunks from the first @@. */
const compareOf = (diff) => ({
  diffs: diff.split(/^(?=diff --git )/m).filter(Boolean).map((chunk) => {
    const from = /^--- (?:a\/)?(.+)$/m.exec(chunk)[1];
    const to = /^\+\+\+ (?:b\/)?(.+)$/m.exec(chunk)[1];
    return { old_path: from === '/dev/null' ? to : from, new_path: to, new_file: from === '/dev/null', deleted_file: false, renamed_file: false, diff: chunk.slice(chunk.indexOf('@@')) };
  }),
});

const claims = {
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
const description = `Fix the export traversal\n\n\`\`\`belay-claims\n${JSON.stringify(claims)}\n\`\`\`\n\nBelay-Task: 01J9ZP6M2Q8E4V7K3N5R1T0XAB\nBelay-Class: code-fix.patch`;
const guardrailNote = (verdict, head = HEAD, findings = []) => ({
  id: 50, system: false, author: { username: 'ai-guardrail-acme' }, created_at: '2026-10-07T10:00:00Z',
  body: `Guardrail\n\n\`\`\`belay-guardrail\n${JSON.stringify({ schema: 'belay.guardrail/1', verdict, head_sha: head, findings })}\n\`\`\``,
});
const scan = (ids) => ({ __raw: JSON.stringify({ engine_version: 'semgrep-sast 5.41.0', finding_ids: ids }) });
const ART = 'projects/1/jobs/9001/artifacts';

/** The group as GitLab answers. Every option is one fact a case changes. */
function group({ desc = description, notes = [guardrailNote('pass')], pipelineSha = HEAD, diff = fixture('fix.diff'), labels = [], baseJunit = fixture('base.junit.xml'), extra = {}, ledgerCommits = [], state = STATE } = {}) {
  return {
    'groups/acme/projects': [
      { id: 1, path_with_namespace: 'acme/ledgerline', web_url: URL_, default_branch: 'main' },
      { id: 2, path_with_namespace: 'other/shared', web_url: 'https://gitlab.example/other/shared', default_branch: 'main' },
    ],
    'projects/1': { id: 1, path_with_namespace: 'acme/ledgerline', web_url: URL_, default_branch: 'main', ci_config_path: null },
    'projects/1/merge_requests': [{ iid: 7, author: { username: 'ai-patcher-acme' } }],
    'projects/1/merge_requests/7': { iid: 7, author: { username: 'ai-patcher-acme' }, description: desc, target_branch: 'main', sha: HEAD, diff_refs: { base_sha: BASE, head_sha: HEAD }, labels },
    'projects/1/merge_requests/7/notes': notes,
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

const TOKENS = { BELAY_BOT_TOKEN: 'bot', BELAY_LEDGER_TOKEN: 'ledger', CI_SERVER_FQDN: 'gitlab.example' };
const sweep = (routes, env = TOKENS) => runScript(dir, '../../apply/sweep.mjs', ['--config', CONFIG, '--policy-remote', POLICY, '--work', path.join(dir, 'work')], { routes, env });
const glabWrites = (r, cmd) => r.writes.filter((w) => w.method === 'GLAB' && w.path === `mr ${cmd}`);
const proofOf = (note) => JSON.parse(/```belay-proof\n([\s\S]*?)\n```/.exec(note.body.message)[1]);
const granted = (r) => r.writes.filter((w) => w.path === 'mr approve' || w.path === 'mr merge');

// Each sweep spawns the engine (npx tsx) up to five times: seconds each, so a case takes tens of seconds.
describe('belay-apply sweep', { timeout: 240_000 }, () => {
  it('(i) passing evidence and a guardrail pass: one proof note, the labels, the approve and the ledger; a second sweep writes nothing', () => {
    const r = sweep(group());
    expect(r.code, r.stderr).toBe(0);
    const notes = glabWrites(r, 'note create');
    expect(notes).toHaveLength(2);
    const proof = proofOf(notes[0]);
    expect(proof).toMatchObject({ verdict: 'pass', class: 'exploit-test', task: { head_sha: HEAD, mr_iid: 7, project_id: 1, run_id: 'pipeline-500' } });
    expect(notes[0].body.message).toMatch(/^\*\*Belay proof: PASS\*\* \| class `exploit-test`/);
    expect(notes[0].body.message.endsWith('\n\nBelay-Task: 01J9ZP6M2Q8E4V7K3N5R1T0XAB')).toBe(true);
    expect(notes[1].body.message).toMatch(/^\*\*Belay gate: APPROVE\*\* \| tier `supervised`/);
    const labels = glabWrites(r, 'update').map((w) => w.body.label);
    expect(labels).toEqual(['proof::pass', 'belay::tier::supervised,guardrail::pass']);
    expect(granted(r)).toEqual([expect.objectContaining({ path: 'mr approve', body: expect.objectContaining({ iid: '7', sha: HEAD, repo: URL_ }) })]);
    const ledger = r.writes.filter((w) => w.path === `${LEDGER}/repository/commits`);
    expect(ledger).toHaveLength(1);
    const lines = ledger[0].body.actions[0].content.trim().split('\n').map((l) => JSON.parse(l));
    expect(lines.map((e) => e.kind)).toEqual(['proof_verdict', 'guardrail_verdict', 'tier_decision']);
    expect(lines[0]).toMatchObject({ subject: { project_id: 1, type: 'mr', iid: 7 }, agent: 'ai-patcher-acme', observed_by: 'ci_job' });
    expect(ledger[0].body.commit_message).toContain(`Belay-Head: 1!7@${HEAD}`);

    // The second sweep reads back what the first wrote: the bot's two notes, and the ledger commit.
    const bot = (id, n) => ({ id, system: false, author: { username: 'belay-bot' }, created_at: '2026-10-07T10:05:00Z', body: n.body.message });
    const again = sweep(group({ notes: [bot(102, notes[1]), bot(101, notes[0]), guardrailNote('pass')], labels: ['proof::pass', 'guardrail::pass'], ledgerCommits: [{ id: 'f'.repeat(40), message: ledger[0].body.commit_message }] }));
    expect(again.code, again.stderr).toBe(0);
    expect(again.writes).toEqual([]);
  });

  it('(ii) a guardrail block: guardrail::block, no approve and no merge', () => {
    const finding = { rule: 'prompt-injection', severity: 'high', file: 'CHANGELOG.md', quote: 'ignore previous instructions', explanation: 'an instruction to the reviewer in the changelog' };
    const r = sweep(group({ notes: [guardrailNote('block', HEAD, [finding])] }));
    expect(r.code, r.stderr).toBe(0);
    expect(glabWrites(r, 'note create')[1].body.message).toMatch(/^\*\*Belay gate: BLOCK\*\*/);
    expect(glabWrites(r, 'update').at(-1).body.label).toContain('guardrail::block');
    expect(granted(r)).toEqual([]);

    // The seeded changelog-injection MR of M2 may carry a class whose proof no builder derives (patch-bump: bench-delta).
    // The guardrail's block still sets guardrail::block, from its verdict alone.
    const bump = sweep(group({ desc: description.replace('Belay-Class: code-fix.patch', 'Belay-Class: patch-bump'), notes: [guardrailNote('block', HEAD, [finding])] }));
    expect(bump.code, bump.stderr).toBe(0);
    const [note, ...more] = glabWrites(bump, 'note create');
    expect(more).toEqual([]);
    expect(note.body.message).toMatch(/^\*\*Belay gate: BLOCK\*\* \| tier `unknown`\n- head a{40}: the guardrail blocked this head; also, no Proof Block could be derived/);
    expect(glabWrites(bump, 'update').map((w) => w.body.label)).toEqual(['guardrail::block']);
    expect(granted(bump)).toEqual([]);
  });

  it('(iii) evidence only from an older head: nothing is applied', () => {
    const r = sweep(group({ pipelineSha: OLD }));
    expect(r.code, r.stderr).toBe(0);
    expect(r.writes).toEqual([]);
    expect(r.reads.some((p) => p.includes('/artifacts/'))).toBe(false);
  });

  it('(iv) an MR that changes .gitlab-ci.yml, or a file it includes: never approved, merged or proof::pass; the note says why', () => {
    const ciHunk = 'diff --git a/.gitlab-ci.yml b/.gitlab-ci.yml\n--- a/.gitlab-ci.yml\n+++ b/.gitlab-ci.yml\n@@ -1 +1 @@\n-stages: [build, test, review]\n+stages: [build, test]\n';
    const includeHunk = ciHunk.replaceAll('.gitlab-ci.yml', 'ci/replay.yml');
    for (const [diff, why] of [[ciHunk, /it changes the CI file \.gitlab-ci\.yml/], [includeHunk, /it changes ci\/replay\.yml, which the CI configuration includes/]]) {
      const r = sweep(group({ diff: fixture('fix.diff') + diff, labels: ['proof::pass'] }));
      expect(r.code, r.stderr).toBe(0);
      const notes = glabWrites(r, 'note create');
      expect(notes).toHaveLength(1);
      expect(notes[0].body.message).toMatch(/^\*\*Belay gate: WAIT\*\*/);
      expect(notes[0].body.message).toMatch(why);
      expect(notes[0].body.message).toContain(HEAD);
      expect(notes[0].body.message).toMatch(/a person reviews it/);
      expect(granted(r)).toEqual([]);
      expect(glabWrites(r, 'update').map((w) => [w.body.label, w.body.unlabel])).toEqual([[undefined, 'proof::pass']]);
      expect(r.writes.filter((w) => w.method === 'POST')).toEqual([]);

      // Read back: the wait note for this head is there, so the next sweep says nothing more.
      const said = { id: 103, system: false, author: { username: 'belay-bot' }, created_at: '2026-10-07T10:05:00Z', body: notes[0].body.message };
      const again = sweep(group({ diff: fixture('fix.diff') + diff, notes: [said, guardrailNote('pass')] }));
      expect(again.writes).toEqual([]);
    }
  });

  it('(v) a forged proof.json in the target artifacts is never read: the re-derived proof decides', () => {
    // The base run is green: the exploit test does not fail at base, so the real proof fails. The target's proof job
    // artifact says pass.
    const green = fixture('head.junit.xml');
    const forged = { __raw: JSON.stringify({ schema: 'belay.proof/1', verdict: 'pass', class: 'exploit-test', task: { head_sha: HEAD }, checks: [], envelope: { within: true }, engine: {} }) };
    const r = sweep(group({ baseJunit: green, extra: { 'projects/1/jobs/9002/artifacts/.belay/proof.json': forged, 'projects/1/jobs/9001/artifacts/.belay/proof.json': forged } }));
    expect(r.code, r.stderr).toBe(0);
    expect(r.reads.some((p) => p.includes('proof.json'))).toBe(false);
    const notes = glabWrites(r, 'note create');
    expect(proofOf(notes[0]).verdict).toBe('fail');
    expect(glabWrites(r, 'update')[0].body.label).toBe('proof::fail');
    expect(granted(r)).toEqual([]);
  });

  it('(vi) a project shared into the group is skipped: not one read of it, not one write', () => {
    const r = sweep(group());
    expect(r.stderr).toMatch(/skip other\/shared: it is shared into acme from elsewhere/);
    expect(r.reads.filter((p) => p.startsWith('projects/2'))).toEqual([]);
    expect(r.writes.filter((w) => JSON.stringify(w).includes('other/shared'))).toEqual([]);
  });

  it('(vii) F61: a forced note of another head that quotes this head stands for that head only: the BLOCK is still said', () => {
    // The agent pushed an earlier head that changed a file named after the head it pushes next, so the earlier head's
    // forced BLOCK quotes this head's sha in its reason.
    const finding = { rule: 'prompt-injection', severity: 'high', file: 'CHANGELOG.md', quote: 'ignore previous instructions', explanation: 'an instruction to the reviewer in the changelog' };
    const earlier = { id: 103, system: false, author: { username: 'belay-bot' }, created_at: '2026-10-07T09:00:00Z',
      body: `**Belay gate: BLOCK** | tier \`unknown\`\n- head ${OLD}: the guardrail blocked this head; also, it changes .gitlab/${HEAD}. This MR controls which jobs made its evidence` };
    const bump = description.replace('Belay-Class: code-fix.patch', 'Belay-Class: patch-bump');
    const r = sweep(group({ desc: bump, notes: [earlier, guardrailNote('block', HEAD, [finding])] }));
    expect(r.code, r.stderr).toBe(0);
    const notes = glabWrites(r, 'note create');
    expect(notes).toHaveLength(1);
    expect(notes[0].body.message).toMatch(new RegExp(`^\\*\\*Belay gate: BLOCK\\*\\* \\| tier \`unknown\`\\n- head ${HEAD}: the guardrail blocked this head`));
    expect(glabWrites(r, 'update').map((w) => w.body.label)).toEqual(['guardrail::block']);
  });

  it('(viii) F62: a gate note made for another head does not stand for this one when the MR returns to it', () => {
    const finding = { rule: 'prompt-injection', severity: 'high', file: 'CHANGELOG.md', quote: 'ignore previous instructions', explanation: 'an instruction to the reviewer in the changelog' };
    const bot = (id, body) => ({ id, system: false, author: { username: 'belay-bot' }, created_at: '2026-10-07T09:00:00Z', body });
    const proofFor = (id, head) => bot(id, `**Belay proof: PASS** | class \`exploit-test\`\n\n\`\`\`belay-proof\n${JSON.stringify({ schema: 'belay.proof/1', verdict: 'pass', task: { head_sha: head } })}\n\`\`\``);
    const blocked = (r) => {
      expect(r.code, r.stderr).toBe(0);
      expect(glabWrites(r, 'note create').at(-1).body.message).toMatch(/^\*\*Belay gate: BLOCK\*\*/);
      expect(glabWrites(r, 'update').at(-1).body.label).toContain('guardrail::block');
      expect(granted(r)).toEqual([]);
    };
    // This head's proof, then a push of another head that changed CI (its forced WAIT), then a push back to this head.
    const wait = bot(103, `**Belay gate: WAIT** | tier \`unknown\`\n- head ${OLD}: it changes .gitlab-ci.yml.`);
    blocked(sweep(group({ notes: [wait, proofFor(101, HEAD), guardrailNote('block', HEAD, [finding])] })));
    // This head's proof, then another head's proof and gate, then back: the proof is posted again, then the gate.
    const r = sweep(group({ notes: [bot(103, '**Belay gate: APPROVE** | tier `supervised`\n- proof pass'), proofFor(102, OLD), proofFor(101, HEAD), guardrailNote('block', HEAD, [finding])] }));
    blocked(r);
    expect(glabWrites(r, 'note create').map((n) => n.body.message.slice(0, 20))).toEqual(['**Belay proof: PASS*', '**Belay gate: BLOCK*']);
  });

  it('(ix) F63: evidence only from a merge request pipeline of the head that ran with no pipeline variables', () => {
    // A newer pipeline of the same head that the agent started through the API, its evidence job passing; the merge
    // request pipeline's own evidence fails (the exploit test is green at base).
    const api = { id: 501, sha: HEAD, status: 'success', source: 'api' };
    const green = fixture('head.junit.xml');
    const r = sweep(group({ baseJunit: green, extra: {
      'projects/1/merge_requests/7/pipelines': [api, { id: 500, sha: HEAD, status: 'success', source: 'merge_request_event' }],
      'projects/1/pipelines/501': api,
      'projects/1/pipelines/501/jobs': [{ id: 9101, name: 'belay-replay', status: 'success', web_url: `${URL_}/-/jobs/9101` }],
      'projects/1/jobs/9101/artifacts/evidence/base/junit.xml': { __raw: fixture('base.junit.xml') },
      'projects/1/jobs/9101/artifacts/evidence/head/junit.xml': { __raw: fixture('head.junit.xml') },
      'projects/1/jobs/9101/artifacts/evidence/base/scan.json': scan(['GL-SAST-4417', 'GL-SAST-4102']),
      'projects/1/jobs/9101/artifacts/evidence/head/scan.json': scan(['GL-SAST-4102']),
    } }));
    expect(r.code, r.stderr).toBe(0);
    expect(r.reads.some((p) => p.includes('jobs/9101') || p.includes('pipelines/501/jobs'))).toBe(false);
    expect(proofOf(glabWrites(r, 'note create')[0]).verdict).toBe('fail');
    expect(granted(r)).toEqual([]);

    // The merge request pipeline itself ran with a pipeline variable: no evidence is read, the MR waits for a person.
    const vars = sweep(group({ extra: { 'projects/1/pipelines/500/variables': [{ key: 'CI_MERGE_REQUEST_DIFF_BASE_SHA', value: OLD, variable_type: 'env_var' }] } }));
    expect(vars.code, vars.stderr).toBe(0);
    expect(vars.reads.some((p) => p.includes('/artifacts/'))).toBe(false);
    const notes = glabWrites(vars, 'note create');
    expect(notes).toHaveLength(1);
    expect(notes[0].body.message).toMatch(new RegExp(`^\\*\\*Belay gate: WAIT\\*\\* \\| tier \`unknown\`\\n- head ${HEAD}: pipeline 500 of this head ran with 1 pipeline variable`));
    expect(granted(vars)).toEqual([]);
  });

  it('(x) F66: a revoke committed while the sweep runs is read before anything is granted', () => {
    // The clone (at the start of the sweep) says supervised; belay-policy now says quarantined.
    const r = sweep(group({ state: STATE.replace('tier: supervised', 'tier: quarantined') }));
    expect(r.code, r.stderr).toBe(0);
    expect(granted(r)).toEqual([]);
    expect(glabWrites(r, 'note create').at(-1).body.message).toMatch(/^\*\*Belay gate: (WAIT|BLOCK)\*\* \| tier `quarantined`/);
  });

  it('(xi) F74: an auto-merge the bot set is cancelled once the gate no longer says merge, after a revoke or a tripwire demotion', () => {
    // The gate and the ledger were applied for this head (as in (i)); tier-state.yml has since changed, by an operator's
    // revoke or by the tripwire, so the gate no longer says merge. The MR still has the auto-merge the bot set.
    const first = sweep(group());
    const [proofNote, gateNote] = glabWrites(first, 'note create');
    const ledger = first.writes.find((w) => w.path === `${LEDGER}/repository/commits`);
    const bot = (id, n) => ({ id, system: false, author: { username: 'belay-bot' }, created_at: '2026-10-07T10:05:00Z', body: n.body.message });
    const done = { notes: [bot(102, gateNote), bot(101, proofNote), guardrailNote('pass')], labels: ['proof::pass', 'guardrail::pass'], ledgerCommits: [{ id: 'f'.repeat(40), message: ledger.body.commit_message }] };
    const CANCEL = 'projects/1/merge_requests/7/cancel_merge_when_pipeline_succeeds';
    const autoMerging = (by, state = STATE) => {
      const g = group({ ...done, state });
      return { ...g, 'projects/1/merge_requests/7': { ...g['projects/1/merge_requests/7'], merge_when_pipeline_succeeds: true, merge_user: { username: by } }, [`POST ${CANCEL}`]: { reply: { iid: 7, merge_when_pipeline_succeeds: false } } };
    };
    for (const [state, tier] of [[STATE, 'supervised'], [STATE.replace('tier: supervised', 'tier: quarantined'), 'quarantined']]) {
      const r = sweep(autoMerging('belay-bot', state));
      expect(r.code, r.stderr).toBe(0);
      expect(r.writes.filter((w) => w.path === CANCEL)).toEqual([expect.objectContaining({ method: 'POST' })]);
      const notes = glabWrites(r, 'note create');
      expect(notes).toHaveLength(1);
      expect(notes[0].body.message).toMatch(new RegExp(`^\\*\\*Belay: auto-merge cancelled\\*\\* for head \`${HEAD}\`: the gate now says (approve|wait|block) at tier ${tier}`));
      expect(granted(r)).toEqual([]);
    }
    // An auto-merge a person set is theirs: the sweep leaves it, and writes nothing.
    expect(sweep(autoMerging('a-maintainer')).writes).toEqual([]);
  });

  it('(xii) F82: open MRs past the page cap end the job red, naming the cap; the MRs that were read are still swept', () => {
    const human = (i) => ({ iid: 1000 + i, author: { username: `dev-${i}` } });
    const pages = Array.from({ length: 5 }, (_, p) => Array.from({ length: 100 }, (_, i) => (p === 0 && i === 0 ? { iid: 7, author: { username: 'ai-patcher-acme' } } : human(p * 100 + i))));
    const r = sweep(group({ extra: { 'projects/1/merge_requests': { __pages: pages } } }));
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/acme\/ledgerline: more than 500 open MRs: the ones past them are not swept/);
    expect(glabWrites(r, 'note create')[0].body.message).toMatch(/^\*\*Belay proof: PASS\*\*/);
  });

  it('(xiii) F76: the ledger is read from the MR\'s creation on, and a history past the page cap stops the MR instead of appending again', () => {
    const other = (i) => ({ id: String(i).padStart(40, '0'), message: `ledger: tier_decision #${i}\n\nBelay-Head: 1!${100 + i}@${OLD}\n\n[skip ci]` });
    const pages = Array.from({ length: 5 }, (_, p) => Array.from({ length: 100 }, (_, i) => other(p * 100 + i)));
    const g = group();
    const r = sweep({ ...g, 'projects/1/merge_requests/7': { ...g['projects/1/merge_requests/7'], created_at: '2026-10-07T09:00:00Z' }, [`${LEDGER}/repository/commits`]: { __pages: pages } });
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/acme\/ledgerline!7: stopped, nothing more written for it: more than 500 commits of events\/1\.jsonl/);
    expect(r.writes.filter((w) => w.path === `${LEDGER}/repository/commits`)).toEqual([]);
    expect(r.reads.find((p) => p.startsWith(`${LEDGER}/repository/commits`))).toContain(`since=${encodeURIComponent('2026-10-07T09:00:00Z')}`);
  });

  it('(xiv) F78: an MR into a branch other than the default is not gated: nothing granted, nothing written, the log says why', () => {
    // Into a branch the agent controls, the MR's base is the agent's code, so base-red is the agent's to make.
    const g = group();
    const r = sweep({ ...g, 'projects/1/merge_requests/7': { ...g['projects/1/merge_requests/7'], target_branch: 'agent-work' } });
    expect(r.code, r.stderr).toBe(0);
    expect(r.writes).toEqual([]);
    expect(r.stderr).toMatch(/acme\/ledgerline!7@a{12}: it targets agent-work, not the default branch main: Belay gates only MRs into main/);
  });

  it('without BELAY_BOT_TOKEN it reports and writes nothing', () => {
    const r = sweep(group(), { CI_SERVER_FQDN: 'gitlab.example' });
    expect(r.code, r.stderr).toBe(0);
    expect(r.writes).toEqual([]);
    expect(r.stderr).toMatch(/reporting only/);
  });

  // The bot token never writes the ledger (F72): without BELAY_LEDGER_TOKEN the sweep reports only, and names the token.
  it('without BELAY_LEDGER_TOKEN it reports, names the missing token and writes nothing', () => {
    const r = sweep(group(), { BELAY_BOT_TOKEN: 'bot', CI_SERVER_FQDN: 'gitlab.example' });
    expect(r.code, r.stderr).toBe(0);
    expect(r.writes).toEqual([]);
    expect(r.stderr).toMatch(/BELAY_LEDGER_TOKEN is not set: reporting only/);
  });

  it('a failed read stops that MR with GitLab\'s message, and nothing is written for it', () => {
    const r = sweep(group({ extra: { 'projects/1/repository/compare': { __http: 500, message: '500 Internal Server Error' } } }));
    expect(r.code).toBe(1);
    expect(r.writes).toEqual([]);
    expect(r.stderr).toMatch(/acme\/ledgerline!7: stopped, nothing more written for it: .*500 Internal Server Error/);
  });
});

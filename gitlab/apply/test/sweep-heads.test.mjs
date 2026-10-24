// belay-apply's MR sweep end to end, which head and which evidence a sweep acts on, the page caps, and how it fails
// closed: (vii)-(x), (xii)-(xiv), (xviii), (xxii). Each case is one of F4's invariants (../README.md).
// rig.mjs holds the fake group, the POLICY clone and the sweep; this file owns its own copy of each.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runScript } from '../../components/scripts/testing/harness.mjs';
import { HEAD, OLD, URL_, fixture, LEDGER, STATE, description, guardrailNote, scan, group, TOKENS, glabWrites, proofOf, granted, rig } from './rig.mjs';

const { dir, POLICY, CONFIG, sweep } = rig('apply-heads');

// Each sweep spawns the engine (npx tsx) up to five times: seconds each, so a case takes tens of seconds.
describe('belay-apply sweep: heads', { timeout: 240_000 }, () => {
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

  it('(xviii) F77: a cited-diff class with no guardrail verdict starts the guardrail; an inconclusive one is a BLOCK', () => {
    const conf = path.join(dir, 'apply-dispatch.json');
    fs.writeFileSync(conf, JSON.stringify({ ...JSON.parse(fs.readFileSync(CONFIG, 'utf8')), targets: { 'acme/ledgerline': { guardrail_consumer_id: 5 }, 'other/shared': {} } }));
    const run = (routes) => runScript(dir, '../../apply/sweep.mjs', ['--config', conf, '--policy-remote', POLICY, '--work', path.join(dir, 'work')], { routes, env: { ...TOKENS, BELAY_DISPATCH_TOKEN: 'dispatch' } });
    const cited = description.replace('Belay-Class: code-fix.patch', 'Belay-Class: guard.block');
    const r = run({ ...group({ desc: cited, notes: [] }), 'POST ai/duo_workflows/workflows': { reply: { id: 77 } } });
    expect(r.code, r.stderr).toBe(0);
    expect(r.writes.filter((w) => w.path === 'ai/duo_workflows/workflows')).toHaveLength(1);
    expect(glabWrites(r, 'note create').map((n) => n.body.message)).toEqual([`**Belay: guardrail review requested** for head \`${HEAD}\` (flow run 77).`]);
    expect(granted(r)).toEqual([]);

    const blockNote = guardrailNote('block');
    const twice = { ...blockNote, body: `${blockNote.body}\n\n${guardrailNote('pass').body}` };
    const ambiguous = run(group({ desc: cited, notes: [twice] }));
    expect(ambiguous.code, ambiguous.stderr).toBe(0);
    expect(glabWrites(ambiguous, 'note create').map((n) => n.body.message)).toEqual([expect.stringMatching(new RegExp(`^\\*\\*Belay gate: BLOCK\\*\\* \\| tier \`unknown\`\\n- head ${HEAD}: the guardrail verdict does not match its schema, or its note carries two`))]);
    expect(granted(ambiguous)).toEqual([]);
  });

  // F127: the diff the gate reads is rebuilt from the compare API. A new file named `infra/x<LF>+++ b/ok.txt`, written bare,
  // began a `+++` header of its own and was read as ok.txt, outside every deny_paths rule. The sweep quotes it as git does.
  it('(xxii) F127: a file name holding a forged +++ line reaches the gate by its real name', async () => {
    const { parseDiff } = await import('../../../engine/parse/diff');
    const name = 'infra/x\n+++ b/ok.txt';
    const compare = { diffs: [{ old_path: name, new_path: name, new_file: true, deleted_file: false, diff: '@@ -0,0 +1 @@\n+x\n' }] };
    // No Belay-Class: the sweep forces a wait before any engine call, after the diff is written.
    const r = sweep(group({ desc: description.replace('\nBelay-Class: code-fix.patch', ''), extra: { 'projects/1/repository/compare': compare } }));
    expect(r.code, r.stderr).toBe(0);
    const patch = fs.readFileSync(path.join(dir, 'work', '1-7', 'diff.patch'), 'utf8');
    expect(parseDiff(patch).map((f) => f.path)).toEqual([name]);
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

  it('a policy clone that fails for good fails the job closed, with the clone message and no write', () => {
    const missing = pathToFileURL(path.join(dir, 'no-such-policy')).href;
    const r = runScript(dir, '../../apply/sweep.mjs', ['--config', CONFIG, '--policy-remote', missing, '--work', path.join(dir, 'work-missing')], { routes: {}, env: TOKENS });
    expect(r.code).toBe(2);
    expect(r.writes).toEqual([]);
    expect(r.stderr).toMatch(/belay-apply: cannot clone acme[/]belay-policy: /);
  });
});

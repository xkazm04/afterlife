// belay-apply's MR sweep end to end, the guardrail block and tier_decision lines the sweep ledgers: (xvi), (xvii),
// (xx), (xxi), and (xxiii) an engine that fails there. Each case is one of F4's invariants (../README.md).
// rig.mjs holds the fake group, the POLICY clone and the sweep; this file owns its own copy of each.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { HEAD, fixture, LEDGER, POLICY_API, STATE, TOKENS, description, guardrailNote, group, glabWrites, granted, rig } from './rig.mjs';

const { dir, sweep } = rig('apply-ledger');

// Each sweep spawns the engine (npx tsx) up to five times: seconds each, so a case takes tens of seconds.
describe('belay-apply sweep: ledger', { timeout: 240_000 }, () => {
  it("(xvi) r2 value-forced-block: on a forced path the guardrail's own block is ledgered once for the head; no other forced cause is", () => {
    const finding = { rule: 'prompt-injection', severity: 'high', file: 'CHANGELOG.md', quote: 'ignore previous instructions', explanation: 'an instruction to the reviewer in the changelog' };
    const ciHunk = 'diff --git a/.gitlab-ci.yml b/.gitlab-ci.yml\n--- a/.gitlab-ci.yml\n+++ b/.gitlab-ci.yml\n@@ -1 +1 @@\n-stages: [build, test, review]\n+stages: [build, test]\n';
    const ledgerOf = (r) => r.writes.filter((w) => w.path === `${LEDGER}/repository/commits`);
    const r = sweep(group({ diff: fixture('fix.diff') + ciHunk, notes: [guardrailNote('block', HEAD, [finding])] }));
    expect(r.code, r.stderr).toBe(0);
    const [note, ...more] = glabWrites(r, 'note create');
    expect(more).toEqual([]);
    expect(note.body.message).toMatch(new RegExp(`^\\*\\*Afterlife gate: BLOCK\\*\\* \\| tier \`unknown\`\\n- head ${HEAD}: the guardrail blocked this head; also, it changes the CI file`));
    expect(glabWrites(r, 'update').map((w) => w.body.label)).toEqual(['guardrail::block']);
    expect(granted(r)).toEqual([]);
    const [ledger, ...again] = ledgerOf(r);
    expect(again).toEqual([]);
    const lines = ledger.body.actions[0].content.trim().split('\n').map((l) => JSON.parse(l));
    expect(lines).toEqual([expect.objectContaining({ seq: 1, kind: 'guardrail_verdict', verdict: 'block', tier_at_time: 'supervised', agent: 'ai-patcher-acme', action_class: 'code-fix.patch', observed_by: 'ci_job', subject: { project_id: 1, type: 'mr', iid: 7 } })]);
    expect(ledger.body.commit_message).toContain(`Belay-Head: 1!7@${HEAD}/guardrail-block`);

    // Read back: the forced note and the ledger commit are there, so the next sweep writes nothing.
    const said = { id: 103, system: false, author: { username: 'belay-bot' }, created_at: '2026-10-07T10:05:00Z', body: note.body.message };
    const after = { diff: fixture('fix.diff') + ciHunk, notes: [said, guardrailNote('block', HEAD, [finding])], labels: ['guardrail::block'] };
    const next = sweep(group({ ...after, ledgerCommits: [{ id: 'f'.repeat(40), message: ledger.body.commit_message }] }));
    expect(next.code, next.stderr).toBe(0);
    expect(next.writes).toEqual([]);
    // A note said before the ledger line was: the line is ledgered, and nothing else is written.
    expect(sweep(group(after)).writes.map((w) => w.path)).toEqual([`${LEDGER}/repository/commits`]);

    // Any other cause ledgers nothing: a CI change with a guardrail pass, a guardrail note with two blocks (ambiguous), and a
    // block for a class nobody holds a tier for (no holder to count it against).
    const blockNote = guardrailNote('block', HEAD, [finding]);
    const twice = { ...blockNote, body: `${blockNote.body}\n\n${guardrailNote('pass').body}` };
    const bump = description.replace('Belay-Class: code-fix.patch', 'Belay-Class: patch-bump');
    for (const g of [group({ diff: fixture('fix.diff') + ciHunk }), group({ notes: [twice] }), group({ desc: bump, notes: [blockNote] })]) {
      const o = sweep(g);
      expect(o.code, o.stderr).toBe(0);
      expect(glabWrites(o, 'note create').at(-1).body.message).toMatch(/^\*\*Afterlife gate: (WAIT|BLOCK)\*\* \| tier `unknown`/);
      expect(ledgerOf(o)).toEqual([]);
    }
  });

  it("(xxiii) an engine gate that answers nothing readable is logged as the engine's failure, never as a policy fact", () => {
    // An AFTERLIFE_DIR whose tsx prints no JSON and exits 2: the gate blockTier asks for the guardrail block's tier gives no answer.
    const broken = path.join(dir, 'broken-engine');
    fs.mkdirSync(path.join(broken, 'node_modules', 'tsx', 'dist'), { recursive: true });
    fs.writeFileSync(path.join(broken, 'node_modules', 'tsx', 'dist', 'cli.mjs'), "process.stdout.write('boom');\nprocess.exit(2);\n");
    const finding = { rule: 'prompt-injection', severity: 'high', file: 'CHANGELOG.md', quote: 'ignore previous instructions', explanation: 'an instruction to the reviewer in the changelog' };
    const ciHunk = 'diff --git a/.gitlab-ci.yml b/.gitlab-ci.yml\n--- a/.gitlab-ci.yml\n+++ b/.gitlab-ci.yml\n@@ -1 +1 @@\n-stages: [build, test, review]\n+stages: [build, test]\n';
    const r = sweep(group({ diff: fixture('fix.diff') + ciHunk, notes: [guardrailNote('block', HEAD, [finding])] }), { ...TOKENS, AFTERLIFE_DIR: broken });
    expect(r.stderr).toMatch(/engine gate gave no readable answer \(exit 2\): the guardrail's block is not ledgered/);
    expect(r.stderr).not.toMatch(/holds ai-patcher-acme at no tier/);
    expect(glabWrites(r, 'note create').at(-1).body.message).toMatch(/^\*\*Afterlife gate: BLOCK\*\*/);
    expect(r.writes.filter((w) => w.path === `${LEDGER}/repository/commits`)).toEqual([]);
  });

  it('(xvii) F81: a guardrail block that comes after the head was gated is applied (BLOCK, guardrail::block) and ledgered once', () => {
    // The gate approved this head at supervised, with a guardrail pass, and the ledger has it (as in (i)). Then the guardrail
    // re-ran on the same head and blocked it.
    const first = sweep(group());
    const [proofNote, gateNote] = glabWrites(first, 'note create');
    const ledger = first.writes.find((w) => w.path === `${LEDGER}/repository/commits`);
    const bot = (id, body) => ({ id, system: false, author: { username: 'belay-bot' }, created_at: '2026-10-07T10:05:00Z', body });
    const finding = { rule: 'prompt-injection', severity: 'high', file: 'CHANGELOG.md', quote: 'ignore previous instructions', explanation: 'an instruction to the reviewer in the changelog' };
    const blocked = { ...guardrailNote('block', HEAD, [finding]), id: 60 };
    const notes = [blocked, bot(102, gateNote.body.message), bot(101, proofNote.body.message), guardrailNote('pass')];
    const r = sweep(group({ notes, labels: ['proof::pass', 'guardrail::pass', 'belay::tier::supervised'], ledgerCommits: [{ id: 'f'.repeat(40), message: ledger.body.commit_message }] }));
    expect(r.code, r.stderr).toBe(0);
    const [note, ...more] = glabWrites(r, 'note create');
    expect(more).toEqual([]);
    expect(note.body.message).toMatch(/^\*\*Afterlife gate: BLOCK\*\* \| tier `supervised`\n.*guardrail blocked/s);
    expect(glabWrites(r, 'update').map((w) => [w.body.label, w.body.unlabel])).toEqual([[expect.stringContaining('guardrail::block'), expect.stringContaining('guardrail::pass')]]);
    expect(granted(r)).toEqual([]);
    const [append, ...twice] = r.writes.filter((w) => w.path === `${LEDGER}/repository/commits`);
    expect(twice).toEqual([]);
    const lines = append.body.actions[0].content.trim().split('\n').map((l) => JSON.parse(l));
    expect(lines.map((e) => [e.kind, e.verdict])).toEqual([['guardrail_verdict', 'block']]);
    expect(append.body.commit_message).toContain(`Belay-Head: 1!7@${HEAD}/guardrail-block`);

    // Read back: the label and the ledger line are there, so the next sweep writes nothing.
    const after = [blocked, bot(103, note.body.message), bot(102, gateNote.body.message), bot(101, proofNote.body.message), guardrailNote('pass')];
    const commits = [{ id: 'e'.repeat(40), message: append.body.commit_message }, { id: 'f'.repeat(40), message: ledger.body.commit_message }];
    const again = sweep(group({ notes: after, labels: ['proof::pass', 'guardrail::block', 'belay::tier::supervised'], ledgerCommits: commits }));
    expect(again.code, again.stderr).toBe(0);
    expect(again.writes).toEqual([]);
  });

  it('(xx) every tier_decision states the tier-state.yml commit its gate read; a withdrawal on a settled head is ledgered once per revision', () => {
    const REV = '1'.repeat(40); // the live tier-state.yml's last_commit_id, as group() answers it
    const first = sweep(group());
    const ledger = first.writes.find((w) => w.path === `${LEDGER}/repository/commits`);
    const decision = ledger.body.actions[0].content.trim().split('\n').map((l) => JSON.parse(l)).find((e) => e.kind === 'tier_decision');
    expect(decision).toMatchObject({ tier_at_time: 'supervised', state_rev: REV });
    expect('withdrew' in decision).toBe(false);

    // The head is settled (gate and ledger applied); a revoke then moves tier-state.yml to a new commit, C1.
    const C1 = 'c1'.repeat(20);
    const [proofNote, gateNote] = glabWrites(first, 'note create');
    const bot = (id, n) => ({ id, system: false, author: { username: 'belay-bot' }, created_at: '2026-10-07T10:05:00Z', body: n.body.message });
    const UNAPPROVE = 'projects/1/merge_requests/7/unapprove';
    const revoked = (ledgerCommits) => {
      const g = group({ notes: [bot(102, gateNote), bot(101, proofNote), guardrailNote('pass')], labels: ['proof::pass', 'guardrail::pass'], ledgerCommits, state: STATE.replace('tier: supervised', 'tier: quarantined') });
      const live = g[`${POLICY_API}/repository/files/tier-state.yml`];
      return { ...g, [`${POLICY_API}/repository/files/tier-state.yml`]: { ...live, last_commit_id: C1 }, 'projects/1/merge_requests/7/approvals': { approved_by: [{ user: { username: 'belay-bot' } }] }, [`POST ${UNAPPROVE}`]: { reply: {} } };
    };
    const head = { id: 'f'.repeat(40), message: ledger.body.commit_message };
    const r = sweep(revoked([head]));
    expect(r.code, r.stderr).toBe(0);
    const appended = r.writes.filter((w) => w.path === `${LEDGER}/repository/commits`);
    expect(appended).toHaveLength(1);
    const lines = appended[0].body.actions[0].content.trim().split('\n').map((l) => JSON.parse(l));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ kind: 'tier_decision', tier_at_time: 'quarantined', state_rev: C1, withdrew: ['approval'], subject: { project_id: 1, type: 'mr', iid: 7 }, observed_by: 'ci_job' });
    expect(appended[0].body.commit_message).toContain(`Belay-Head: 1!7@${HEAD}/withdrawn@${C1}`);
    expect(appended[0].body.commit_message).not.toContain(`Belay-Head: 1!7@${HEAD}\n`);

    // Deduplicated: with that commit in the ledger's history, a sweep that withdraws again on C1 appends nothing.
    const again = sweep(revoked([head, { id: 'e'.repeat(40), message: appended[0].body.commit_message }]));
    expect(again.code, again.stderr).toBe(0);
    expect(again.writes.filter((w) => w.path === UNAPPROVE)).toHaveLength(1);
    expect(again.writes.filter((w) => w.path === `${LEDGER}/repository/commits`)).toEqual([]);
    // Reporting only: the withdrawal is said, nothing is written, the ledger included.
    const dry = sweep(revoked([head]), { CI_SERVER_FQDN: 'gitlab.example' });
    expect(dry.code, dry.stderr).toBe(0);
    expect(dry.writes).toEqual([]);
  });

  it("(xxi) the next rung runs as a shadow: the tier_decision states what the gate would decide one rung up; nothing is applied from it", () => {
    const decisionOf = (r) => r.writes.find((w) => w.path === `${LEDGER}/repository/commits`).body.actions[0].content.trim().split('\n').map((l) => JSON.parse(l)).find((e) => e.kind === 'tier_decision');
    // code-fix.patch held at assisted under its supervised ceiling: the gate waits; one rung up the same inputs approve
    const assisted = STATE.replace('tier: supervised', 'tier: assisted');
    const r = sweep(group({ state: assisted }));
    expect(r.code, r.stderr).toBe(0);
    expect(decisionOf(r)).toMatchObject({ tier_at_time: 'assisted', would: { tier: 'supervised', decision: 'approve' } });
    expect(glabWrites(r, 'note create')[1].body.message).toMatch(/^\*\*Afterlife gate: WAIT\*\* \| tier `assisted`/);
    expect(granted(r)).toEqual([]); // the shadow's approve is never given
    expect(glabWrites(r, 'update').map((w) => w.body.label)).toEqual(['proof::pass', 'belay::tier::assisted,guardrail::pass']);
    // at the ceiling there is no next rung, so (i)'s supervised decision states none
    expect('would' in decisionOf(sweep(group()))).toBe(false);
    // reporting only: nothing is written, the ledger included
    expect(sweep(group({ state: assisted }), { CI_SERVER_FQDN: 'gitlab.example' }).writes).toEqual([]);
  });
});

// belay-apply's MR sweep end to end, what the bot gave and later takes back: an auto-merge (xi) and an approval (xv),
// (xix). Each case is one of F4's invariants (../README.md).
// rig.mjs holds the fake group, the POLICY clone and the sweep; this file owns its own copy of each.
import { describe, expect, it } from 'vitest';
import { HEAD, OLD, LEDGER, STATE, guardrailNote, group, glabWrites, granted, rig } from './rig.mjs';

const { sweep } = rig('apply-withdraw');

// Each sweep spawns the engine (npx tsx) up to five times: seconds each, so a case takes tens of seconds.
describe('belay-apply sweep: withdraw', { timeout: 240_000 }, () => {
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
      expect(notes[0].body.message).toMatch(new RegExp(`^\\*\\*Afterlife: auto-merge cancelled\\*\\* for head \`${HEAD}\`: the gate now says (approve|wait|block) at tier ${tier}`));
      expect(granted(r)).toEqual([]);
    }
    // An auto-merge a person set is theirs: the sweep leaves it, and writes nothing.
    expect(sweep(autoMerging('a-maintainer')).writes).toEqual([]);
  });

  it('(xv) F89: an approval the bot gave is withdrawn once the gate no longer says approve or merge; a person\'s is never touched', () => {
    // The gate approved this head at supervised and the ledger has it (as in (i)). Then a revoke or a tripwire demotion
    // changes tier-state.yml, and the bot's approval would still count toward the target's approval rules.
    const first = sweep(group());
    const [proofNote, gateNote] = glabWrites(first, 'note create');
    const ledger = first.writes.find((w) => w.path === `${LEDGER}/repository/commits`);
    const bot = (id, n) => ({ id, system: false, author: { username: 'belay-bot' }, created_at: '2026-10-07T10:05:00Z', body: n.body.message });
    const done = { notes: [bot(102, gateNote), bot(101, proofNote), guardrailNote('pass')], labels: ['proof::pass', 'guardrail::pass'], ledgerCommits: [{ id: 'f'.repeat(40), message: ledger.body.commit_message }] };
    const UNAPPROVE = 'projects/1/merge_requests/7/unapprove';
    const REVOKED = STATE.replace('tier: supervised', 'tier: quarantined');
    const approvedBy = (users, state = STATE) => ({ ...group({ ...done, state }), 'projects/1/merge_requests/7/approvals': { approved_by: users.map((username) => ({ user: { username } })) }, [`POST ${UNAPPROVE}`]: { reply: {} } });

    const r = sweep(approvedBy(['belay-bot', 'a-maintainer'], REVOKED));
    expect(r.code, r.stderr).toBe(0);
    expect(r.writes.filter((w) => w.path === UNAPPROVE)).toEqual([expect.objectContaining({ method: 'POST' })]);
    const notes = glabWrites(r, 'note create');
    expect(notes).toHaveLength(1);
    expect(notes[0].body.message).toMatch(new RegExp(`^\\*\\*Afterlife: approval withdrawn\\*\\* for head \`${HEAD}\`: the gate now says (wait|block) at tier quarantined`));
    expect(granted(r)).toEqual([]);
    // the unapprove, its note, and the one ledger commit of the withdrawal (case xx)
    expect(r.writes).toHaveLength(3);

    // Once: the next sweep finds only the person's approval, and leaves it.
    expect(sweep(approvedBy(['a-maintainer'], REVOKED)).writes).toEqual([]);
    // A head the gate still approves keeps the bot's approval.
    expect(sweep(approvedBy(['belay-bot'])).writes).toEqual([]);
    // Reporting only: it says what it would withdraw, and writes nothing.
    const dry = sweep(approvedBy(['belay-bot'], REVOKED), { CI_SERVER_FQDN: 'gitlab.example' });
    expect(dry.code, dry.stderr).toBe(0);
    expect(dry.writes).toEqual([]);
    expect(dry.stderr).toMatch(/withdrawing the approval the bot gave: the gate now says (wait|block) at tier quarantined/);
  });

  it('(xix) F89: an approval the bot gave an earlier head is withdrawn when this head is not gated yet, or not to approve or merge', () => {
    // The bot proved and approved OLD. The agent pushed HEAD, and the target keeps approvals on new commits.
    const bot = (id, body) => ({ id, system: false, author: { username: 'belay-bot' }, created_at: '2026-10-07T09:00:00Z', body });
    const proofOld = bot(101, `**Belay proof: PASS** | class \`exploit-test\`\n\n\`\`\`belay-proof\n${JSON.stringify({ schema: 'belay.proof/1', verdict: 'pass', task: { head_sha: OLD } })}\n\`\`\``);
    const approveOld = bot(102, '**Belay gate: APPROVE** | tier `supervised`\n- supervised: checks pass, a human approver still merges');
    const UNAPPROVE = 'projects/1/merge_requests/7/unapprove';
    const approvedBy = (users, o = {}) => ({ ...group({ notes: [approveOld, proofOld, guardrailNote('pass')], ...o }), 'projects/1/merge_requests/7/approvals': { approved_by: users.map((username) => ({ user: { username } })) }, [`POST ${UNAPPROVE}`]: { reply: {} } });
    const withdrawn = (r, why) => {
      expect(r.code, r.stderr).toBe(0);
      expect(r.writes.filter((w) => w.path === UNAPPROVE)).toEqual([expect.objectContaining({ method: 'POST' })]);
      expect(glabWrites(r, 'note create').map((n) => n.body.message)).toContainEqual(expect.stringMatching(new RegExp(`^\\*\\*Afterlife: approval withdrawn\\*\\* for head \`${HEAD}\`: ${why}`)));
      expect(granted(r)).toEqual([]);
    };

    // HEAD has no finished pipeline yet, so no gate decision: the approval of OLD is withdrawn now.
    withdrawn(sweep(approvedBy(['belay-bot', 'a-maintainer'], { pipelineSha: OLD })), 'the bot approved an earlier head, and this one has no gate decision yet');
    // HEAD is gated, and the gate says wait or block (a revoke): withdrawn.
    withdrawn(sweep(approvedBy(['belay-bot'], { state: STATE.replace('tier: supervised', 'tier: quarantined') })), 'the gate now says (wait|block) at tier quarantined');
    // A person's approval alone is left; and HEAD's own gate says approve, so the bot's approval stands.
    expect(sweep(approvedBy(['a-maintainer'], { pipelineSha: OLD })).writes).toEqual([]);
    expect(sweep(approvedBy(['belay-bot'])).writes.filter((w) => w.path === UNAPPROVE)).toEqual([]);
    // No APPROVE for an earlier head: the approvals are not read before this head is gated.
    const plain = sweep(group({ pipelineSha: OLD }));
    expect(plain.reads.some((p) => p.endsWith('/approvals'))).toBe(false);
  });
});

// belay-apply's MR sweep end to end, what one sweep applies to an agent MR: the proof, the gate, the labels and the
// ledger, once each (i)-(vi). Each case is one of F4's invariants (../README.md).
// rig.mjs holds the fake group, the POLICY clone and the sweep; this file owns its own copy of each.
import { describe, expect, it } from 'vitest';
import { HEAD, OLD, URL_, fixture, LEDGER, description, guardrailNote, group, glabWrites, proofOf, granted, rig } from './rig.mjs';

const { sweep } = rig('apply-apply');

// Each sweep spawns the engine (npx tsx) up to five times: seconds each, so a case takes tens of seconds.
describe('belay-apply sweep: apply', { timeout: 240_000 }, () => {
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
    expect(lines.map((e) => e.verdict)).toEqual([undefined, 'pass', undefined]); // the guardrail's verdict, from its note to the ledger
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
});

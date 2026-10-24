// The M1 hand-run's step 4 (F90): derive-gate.mjs derives the gate's ledger events on the operator's machine from what
// GitLab holds (the notes, belay-policy's default branch, the compare API), against a fake glab and the real engine. It
// emits what apply-gate emits for the same inputs, trusts only the guardrail account named on its command line, never
// reads a job artifact and writes nothing to GitLab.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { runScript } from '../testing/harness.mjs';
import { applyGateOn, derive, DIFF, dir, LEDGER, noArtifactNoWrite, note, OP, PROOF, proofNote, routes, URL_, verdict, withoutAt } from './derive-gate.fixture.mjs';

afterAll(() => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

describe('derive-gate (M1 hand-run step 4, F90)', { timeout: 120_000 }, () => {
  it('(i) emits the proof_verdict, guardrail_verdict and tier_decision bodies apply-gate emits for the same inputs', () => {
    for (const v of ['pass', 'block']) {
      const notes = [note(50, 'ai-guardrail-acme', 'belay-guardrail', verdict(v)), proofNote];
      const got = derive(`same-${v}`, { notes });
      expect(got.r.code, got.r.stderr).toBe(0);
      expect(got.files).toEqual(['0-proof_verdict.json', '1-guardrail_verdict.json', '2-tier_decision.json']);
      const want = applyGateOn(verdict(v));
      expect(got.files.map((f) => withoutAt(got.read(f)))).toEqual(want.map(withoutAt));
      expect(got.read('1-guardrail_verdict.json')).toMatchObject({ verdict: v, tier_at_time: 'supervised', agent: 'ai-patcher-acme', payload_ref: `${URL_}/-/merge_requests/7`, subject: { project_id: 1, iid: 7 } });
      noArtifactNoWrite(got.r);
    }
  });

  it('(ii) a guardrail note by an author not named in --authors yields no pass, whatever the variables say', () => {
    const agentPass = note(60, 'ai-patcher-acme', 'belay-guardrail', verdict('pass'));
    const alone = derive('agent-only', { notes: [agentPass, proofNote] });
    expect(alone.r.code, alone.r.stderr).toBe(3);
    expect(alone.r.stderr).toMatch(/no belay-guardrail verdict by ai-guardrail-acme .*the ledger line waits/);
    expect(alone.files).toEqual([]);
    noArtifactNoWrite(alone.r);

    // The agent's newer pass does not shadow the guardrail's own block.
    const shadow = derive('agent-shadow', { notes: [agentPass, note(50, 'ai-guardrail-acme', 'belay-guardrail', verdict('block')), proofNote] });
    expect(shadow.r.code, shadow.r.stderr).toBe(0);
    expect(shadow.read('1-guardrail_verdict.json').verdict).toBe('block');
    noArtifactNoWrite(shadow.r);
  });

  it('a proof the operator did not post, or an MR that changes its CI configuration, yields no events', () => {
    const notMine = derive('agent-proof', { notes: [note(50, 'ai-guardrail-acme', 'belay-guardrail', verdict('pass')), note(40, 'ai-patcher-acme', 'belay-proof', PROOF)] });
    expect(notMine.r.code, notMine.r.stderr).toBe(3);
    expect(notMine.r.stderr).toMatch(/no belay-proof note by op-hand/);
    expect(notMine.files).toEqual([]);

    const ci = derive('ci', { diff: `${DIFF}diff --git a/.gitlab-ci.yml b/.gitlab-ci.yml\n--- a/.gitlab-ci.yml\n+++ b/.gitlab-ci.yml\n@@ -1 +1 @@\n-stages: [build]\n+stages: [build, test]\n` });
    expect(ci.r.code, ci.r.stderr).toBe(3);
    expect(ci.r.stderr).toMatch(/it changes the CI file \.gitlab-ci\.yml/);
    expect(ci.files).toEqual([]);
    for (const x of [notMine, ci]) noArtifactNoWrite(x.r);
  });

  it('exits 2 when the notes cannot be read (not known), and 3 when the proof note is ambiguous', () => {
    const down = derive('notes-down', { notes: { __http: 403, message: '403 Forbidden' } });
    expect(down.r.code, down.r.stderr).toBe(2);
    expect(down.r.stderr).toMatch(/reading the belay-proof note failed/);
    expect(down.files).toEqual([]);

    const twice = note(40, OP, 'belay-proof', PROOF);
    twice.body += `\n\n\`\`\`belay-proof\n${JSON.stringify(PROOF)}\n\`\`\``;
    const ambiguous = derive('proof-twice', { notes: [note(50, 'ai-guardrail-acme', 'belay-guardrail', verdict('pass')), twice] });
    expect(ambiguous.r.code, ambiguous.r.stderr).toBe(3);
    expect(ambiguous.r.stderr).toMatch(/belay-proof note for this head is ambiguous/);
    expect(ambiguous.files).toEqual([]);
    for (const x of [down, ambiguous]) noArtifactNoWrite(x.r);
  });

  it('refuses an out directory that already holds files, before any read', () => {
    const out = path.join(dir, 'out-used');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'stale.json'), '{}');
    const r = runScript(dir, 'hand/derive-gate.mjs', ['--mr', '7', '--proof-authors', OP, '--guardrail-authors', 'ai-guardrail-acme', '--policy-project', 'acme/belay-policy', '--ledger-project', LEDGER, '--out', out], { routes: routes() });
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/is not empty/);
    expect(r.reads).toEqual([]);
  });
});

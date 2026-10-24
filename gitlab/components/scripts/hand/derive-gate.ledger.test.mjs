// derive-gate's tie to the ledger (F90): the key it writes, the append command it prints (run as printed, in bash), and
// its refusal of a head the ledger already carries. Fixtures in derive-gate.fixture.mjs; the derivation itself in
// derive-gate.test.mjs.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { ROOT } from '../testing/harness.mjs';
import { commit, derive, dir, HEAD, KEY, LEDGER, LEDGER_API, noArtifactNoWrite } from './derive-gate.fixture.mjs';

afterAll(() => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

describe('derive-gate and the ledger (M1 hand-run step 4, F90)', { timeout: 120_000 }, () => {
  it('writes the key belay-apply forms (numeric project id, MR iid, head) to ledger-key, and prints the append command', () => {
    const got = derive('key');
    expect(got.r.code, got.r.stderr).toBe(0);
    expect(fs.readFileSync(path.join(got.out, 'ledger-key'), 'utf8').trim()).toBe(KEY);
    expect(got.r.stderr).toContain(`ledger-append.mjs' --events '${path.join(got.out, 'events')}' --project '${LEDGER}' --branch 'main' --key '${KEY}'`);
    noArtifactNoWrite(got.r);
  });

  it('prints an append command that runs as printed in bash: BELAY_DIR set, C:\\ paths kept, the key on the commit', () => {
    const got = derive('printed');
    expect(got.r.code, got.r.stderr).toBe(0);
    const printed = /^Append them once: (.*)$/m.exec(got.r.stderr)?.[1];
    expect(printed).toContain(`BELAY_DIR='${ROOT}'`);
    const ledgerApi = `projects/${encodeURIComponent(LEDGER)}`;
    const routesFile = path.join(dir, 'printed-routes.json');
    const writesFile = path.join(dir, 'printed-writes.jsonl');
    fs.writeFileSync(routesFile, JSON.stringify({
      [`${ledgerApi}/repository/files/events%2F1.jsonl`]: { __http: 404, message: '404 File Not Found' },
      [`POST ${ledgerApi}/repository/commits`]: { reply: { id: 'f'.repeat(40) } },
    }));
    fs.writeFileSync(writesFile, '');
    // The operator's shell: no BELAY_DIR and no CI_PROJECT_ID of its own, so the command must carry both.
    const r = spawnSync('bash', ['-c', printed], { cwd: dir, encoding: 'utf8', env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT,
      BELAY_GLAB: `${process.execPath}|${path.join(ROOT, 'gitlab/components/scripts/testing/fake-glab.mjs')}`, FAKE_GLAB_ROUTES: routesFile, FAKE_GLAB_WRITES: writesFile } });
    expect(r.status, r.stderr).toBe(0);
    const [write] = fs.readFileSync(writesFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    expect(write.body.actions.map((a) => a.file_path)).toEqual(['events/1.jsonl']);
    expect(write.body.commit_message.split('\n')).toContain(`Belay-Head: ${KEY}`);
    expect(write.body.actions[0].content.trim().split('\n')).toHaveLength(3);
  });

  it('refuses a head the ledger already carries (exit 3, no events directory), not another head of the same MR', () => {
    const had = derive('had', { ledger: [commit(`1!6@${HEAD}`), commit(KEY)] });
    expect(had.r.code, had.r.stderr).toBe(3);
    expect(had.r.stderr).toMatch(/already ledgered for this head/);
    expect(fs.existsSync(path.join(had.out, 'events'))).toBe(false);
    expect(had.r.reads.some((p) => p.startsWith(`${LEDGER_API}?ref_name=main&path=${encodeURIComponent('events/1.jsonl')}`))).toBe(true);
    noArtifactNoWrite(had.r);

    const other = derive('other-head', { ledger: [commit(`1!7@${'c'.repeat(40)}`), commit(`2!7@${HEAD}`)] });
    expect(other.r.code, other.r.stderr).toBe(0);
    expect(other.files.length).toBe(3);
  });

  it('exits 2 when the ledger cannot be read or has more commits than it reads, and writes no events', () => {
    const failed = derive('ledger-down', { ledger: { __http: 500, message: 'boom' } });
    expect(failed.r.code).toBe(2);
    const pages = Array.from({ length: 5 }, () => Array.from({ length: 100 }, () => commit('9!9@x')));
    const capped = derive('ledger-cap', { ledger: { __pages: pages } });
    expect(capped.r.code).toBe(2);
    expect(capped.r.stderr).toMatch(/not known/);
    for (const x of [failed, capped]) expect(x.files).toEqual([]);
  });
});

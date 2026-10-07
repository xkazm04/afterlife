// fetch-block.mjs picks the block a decision rests on. The tier gate approves or merges at the MR's current head, so
// the Proof Block it reads must be one the bot made for that head: a pass for an earlier push says nothing about this one.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { runScript, SCRIPTS, workdir } from '../testing/harness.mjs';

const dir = workdir('fetch');
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const HEAD = 'b'.repeat(40);
const OLD = 'a'.repeat(40);
const proof = (sha, verdict) => ({ schema: 'belay.proof/1', class: 'exploit-test', verdict, task: { head_sha: sha, trailer: 'Belay-Task: 01JA0000000000000000000000' }, checks: [] });
const note = (id, author, body) => ({ id, system: false, author: { username: author }, created_at: `2026-10-07T10:0${id}:00Z`, body });
const fenced = (v) => '```belay-proof\n' + JSON.stringify(v, null, 2) + '\n```';
const fetchProof = (notes, out) =>
  runScript(dir, 'proof/fetch-block.mjs', ['--mr', '7', '--tag', 'belay-proof', '--authors', 'belay-bot', '--head-sha', HEAD, '--out', out], { routes: { 'projects/1/merge_requests/7/notes': notes } });

describe('fetch-block --head-sha with Proof Blocks', () => {
  it('takes the bot block for this head, not a newer one for an older head or anyone else’s', () => {
    const notes = [note(3, 'belay-bot', fenced(proof(OLD, 'pass'))), note(2, 'mallory', fenced(proof(HEAD, 'pass'))), note(1, 'belay-bot', fenced(proof(HEAD, 'fail')))];
    const r = fetchProof(notes, 'p1.json');
    expect(r.code, r.stderr).toBe(0);
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'p1.json'), 'utf8'))).toMatchObject({ verdict: 'fail', task: { head_sha: HEAD } });
  });

  it('finds nothing (exit 3) when the only bot proof is for an older head', () => {
    expect(fetchProof([note(1, 'belay-bot', fenced(proof(OLD, 'pass')))], 'p2.json').code).toBe(3);
  });

  it('the tier gate asks for the proof of the head it acts on', () => {
    const template = fs.readFileSync(path.join(SCRIPTS, '..', 'templates', 'tier-gate', 'template.yml'), 'utf8');
    const line = template.split('\n').find((l) => l.includes('--tag belay-proof'));
    expect(line).toContain('--head-sha "$BELAY_HEAD_SHA"');
  });
});

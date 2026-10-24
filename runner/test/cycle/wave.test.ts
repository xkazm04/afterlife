// The wave branch's own check after its lanes landed: setup then the gates on the tip. A setup that is red only there
// (green on base and in each lane's fresh worktree) must leave its output, not a bare mergeable: false.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { FAKE, makeFleet, runOne, sh, type TempFleet } from './repo';

let f: TempFleet;
beforeAll(() => {
  // setup.mjs is red once ok-a.txt exists: never in a lane's worktree (setup runs before claude), always on the tip.
  f = makeFleet('belay-wave-', '    setup: [node setup.mjs]\n');
  fs.writeFileSync(path.join(f.repoDir, 'setup.mjs'), "import fs from 'node:fs'; if (fs.existsSync('ok-a.txt')) { console.error('SETUP broke on ok-a.txt'); process.exit(3); }\n");
  sh(f.repoDir, 'add', 'setup.mjs');
  sh(f.repoDir, 'commit', '-q', '-m', 'setup');
  process.env.BELAY_CLAUDE_BIN = FAKE;
});
afterAll(() => {
  delete process.env.BELAY_CLAUDE_BIN;
  fs.rmSync(f.tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

describe('the wave branch check', () => {
  it('a setup red only on the landed tip is saved as the wave gate log and printed', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const r = await runOne(f, ['ok-a']);
      expect(r.ends['ok-a']).toMatchObject({ outcome: 'landed' });
      const end = r.lines.find((e) => e.kind === 'wave.end');
      const gateLog = `temp/${r.wave}.wave.gate.log`;
      expect(end).toMatchObject({ mergeable: false, branchKept: true, gateLog });
      expect(fs.readFileSync(path.join(f.runsDir, gateLog), 'utf8')).toContain('SETUP broke on ok-a.txt');
      expect(err).toHaveBeenCalledWith(expect.stringContaining('wave setup red: node setup.mjs (exit 3)'));
    } finally {
      err.mockRestore();
    }
  }, 90_000);
});

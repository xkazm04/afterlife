// Every MR the door opens asks GitLab to delete its source branch on merge, so a same-day retry does not meet the branch the
// last MR left behind (noBranch refuses one that exists). Arm and disarm already do; promote, enroll and the gap MR must too.
import { parseDocument } from 'yaml';
import { describe, expect, it } from 'vitest';
import { liveRig, policyFiles } from '../../__tests__/rig';
import { previewIntent } from '../../run';

const FLAG = 'remove_source_branch=true';
const promote = { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' };
const enroll = { kind: 'enroll-track', project: 'ledgerline', track: 'T4' };
const gap = { kind: 'stage-gap-mr', project: 'ledgerline', gap: 'g1', stage: 'secure', from: 3, to: 4, title: 'T', branch: 'belay/gap-g1', files: [{ path: '.gitlab/belay/new.yml', content: 'a: 1\n' }] };

/** The createMr commands of a preview: the ones addressed to <project>/merge_requests. */
async function mrs(intent: unknown, unenroll = false): Promise<string[]> {
  const { deps, gl } = await liveRig();
  if (unenroll) {
    const doc = parseDocument(policyFiles(gl)['tier-state.yml']!);
    doc.deleteIn(['agents', 'ai-guardrail-acme-lab']);
    policyFiles(gl)['tier-state.yml'] = doc.toString({ lineWidth: 0 });
  }
  const r = await previewIntent(deps, intent);
  if (r.status !== 'preview') throw new Error(r.status === 'refused' ? r.reason : r.status);
  return r.preview.commands.map((c) => c.argv.join(' ')).filter((a) => /\/merge_requests /.test(`${a} `));
}

describe('the MR a plan opens deletes its source branch on merge', () => {
  it('promote', async () => {
    const m = await mrs(promote, true);
    expect(m).toHaveLength(1);
    expect(m[0]).toContain(FLAG);
  });

  it('enroll', async () => {
    const m = await mrs(enroll, true);
    expect(m).toHaveLength(1);
    expect(m[0]).toContain(FLAG);
  });

  it('gap', async () => {
    const m = await mrs(gap);
    expect(m).toHaveLength(1);
    expect(m[0]).toContain(FLAG);
  });
});

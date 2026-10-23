// A Hands-off promotion writes lease_expires from trust-policy.yml's grant_ttl_days. The engine's parser does not check
// that key, so planPromote reads it as Ladder's lease line does (server/data/policy.ts: a finite number, else none stated):
// a value that is set but is not a number of days is refused with its name, never written as a lease nobody can read,
// and never a crash of the preview (`new Date(NaN).toISOString()` throws a RangeError, which no plan catches).
import { describe, expect, it } from 'vitest';
import { previewIntent } from '../../run';
import { liveRig, policyFiles } from '../../__tests__/rig';

const promote = { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' };

async function withTtl(value: string) {
  const rig = await liveRig();
  const files = policyFiles(rig.gl);
  const text = files['trust-policy.yml'] ?? '';
  files['trust-policy.yml'] = text.replace(/^grant_ttl_days: .*$/m, `grant_ttl_days: ${value}`);
  expect(files['trust-policy.yml']).toContain(`grant_ttl_days: ${value}`);
  return rig;
}

describe('planPromote and grant_ttl_days', () => {
  it.each([['two weeks'], ['-3'], ['.nan'], ['"14"']])('refuses a Hands-off grant when grant_ttl_days is %s, naming the key', async (v) => {
    const { gl, deps } = await withTtl(v);
    const r = await previewIntent(deps, promote);
    expect(r).toMatchObject({ status: 'refused', reason: expect.stringContaining('grant_ttl_days') });
    expect(gl.state.writes).toEqual([]);
  });

  it('still writes the lease from a number of days, and none when the key is 0', async () => {
    const days = await previewIntent((await withTtl('14')).deps, promote);
    expect(days.status === 'preview' && days.preview.diff.join('\n')).toMatch(/lease_expires: "2026-10-20/);
    const none = await previewIntent((await withTtl('0')).deps, promote);
    expect(none.status === 'preview' && none.preview.diff.join('\n')).not.toMatch(/lease_expires/);
  });
});

// A class in its cooldown (tier-state.yml's cooldown_until ahead of now) is not promoted: planPromote refuses with the
// date. A re-admission of a quarantined class to Assisted is not a promotion past the cooldown: it is planned, and the new
// record keeps the cooldown, so the class still cannot climb above Assisted before that date.
import { describe, expect, it } from 'vitest';
import { previewIntent } from '../../run';
import { liveRig, policyFiles } from '../../__tests__/rig';

const reason = (r: Awaited<ReturnType<typeof previewIntent>>): string => (r.status === 'refused' ? r.reason : r.status);
const promote = (cls: string, to: string) => ({ kind: 'promote-class', project: 'ledgerline', class: cls, to });

/** qa.file-bug's record (the demo's: supervised) with a cooldown_until. */
async function cooling(until: string) {
  const rig = await liveRig();
  const files = policyFiles(rig.gl);
  const text = files['tier-state.yml'] ?? '';
  files['tier-state.yml'] = text.replace(/(qa\.file-bug: \{[^}]*)\}/, `$1, cooldown_until: "${until}" }`);
  expect(files['tier-state.yml']).not.toBe(text);
  return rig;
}

describe('planPromote and the cooldown', () => {
  it('refuses a promotion while cooldown_until is ahead, naming the date', async () => {
    const { gl, deps } = await cooling('2026-10-13'); // the rig's now is 2026-10-06
    expect(reason(await previewIntent(deps, promote('qa.file-bug', 'hands_off')))).toMatch(/qa\.file-bug is in its cooldown until 2026-10-13/);
    expect(gl.state.writes).toEqual([]);
  });

  it('plans it from that date on', async () => {
    const { deps } = await cooling('2026-10-06');
    expect((await previewIntent(deps, promote('qa.file-bug', 'hands_off'))).status).toBe('preview');
  });

  it('re-admits a quarantined class to Assisted, and the new record keeps its cooldown', async () => {
    const { deps } = await liveRig(); // patch-bump: quarantined by the tripwire, cooldown_until 2026-10-13
    const r = await previewIntent(deps, promote('patch-bump', 'assisted'));
    if (r.status !== 'preview') throw new Error(reason(r));
    const added = r.preview.diff.filter((l) => l.startsWith('+ ')).join('\n');
    expect(added).toMatch(/patch-bump: \{ tier: assisted, .*cooldown_until: "2026-10-13"/);
    expect(reason(await previewIntent(deps, promote('patch-bump', 'supervised')))).toMatch(/cooldown until 2026-10-13/);
  });
});

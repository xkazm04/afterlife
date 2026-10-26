// The promote preview states the human key as a precondition of the write, not as a rule Afterlife met: a person merges the
// policy MR, and Afterlife never does (planPromote opens it and stops).
import { describe, expect, it } from 'vitest';
import { HUMAN_KEY } from '@/lib/promotion';
import { previewIntent } from '../../run';
import { liveRig } from '../../__tests__/rig';

describe('the promote preview', () => {
  it('states the precondition: a person merges this MR; Afterlife never merges it', async () => {
    const { gl, deps } = await liveRig();
    const r = await previewIntent(deps, { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' });
    if (r.status !== 'preview') throw new Error(r.status === 'refused' ? r.reason : r.status);
    expect(r.preview.summary).toContain(`Precondition: ${HUMAN_KEY}.`);
    expect(gl.state.writes).toEqual([]);
  });
});

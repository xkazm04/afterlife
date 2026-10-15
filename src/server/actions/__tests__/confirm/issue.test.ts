// A result names an MR ("!22") only for a command that opened one. GitLab's answer to a label change on an issue or work
// item also carries an `iid` and a `web_url`, so run.ts once named the CRA label change "!3" and linked the issue as an MR.
import { describe, expect, it } from 'vitest';
import { liveRig } from '../rig';
import { confirmIntent, previewIntent } from '../../run';
import type { ActionResponse } from '../../types';

const cra = { kind: 'mark-cra-ready', project: 'ledgerline', issue: 3 };
const promote = { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' };
const idOf = (r: ActionResponse) => (r.status === 'preview' ? r.preview.previewId : `not a preview: ${r.status}`);

describe('what a confirm says it made', () => {
  it('a label change on a work item names no MR', async () => {
    const { deps } = await liveRig();
    const r = await confirmIntent(deps, cra, idOf(await previewIntent(deps, cra)));
    expect(r.status).toBe('done');
    const results = r.status === 'done' ? r.results : [];
    expect(results).toHaveLength(1);
    expect(results.flatMap((x) => [x.made ?? [], x.url ?? []]).flat()).toEqual([]);
  });

  it('a promotion still names the commit and the MR it opened (the control)', async () => {
    const { deps } = await liveRig();
    const r = await confirmIntent(deps, promote, idOf(await previewIntent(deps, promote)));
    expect(r.status === 'done' && r.results.map((x) => x.made)).toEqual([expect.stringMatching(/^commit [0-9a-f]{8}$/), expect.stringMatching(/^!\d+$/)]);
  });
});

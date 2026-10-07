// A revoke or a promotion runs only if confirm plans exactly what the preview showed (previewId). Live, the clock moves
// between the two clicks: a record stamped to the millisecond made every confirm 'changed', so a person could never
// lower a tier from Belay (F52). What the click writes must not depend on the second it is clicked in.
import { describe, expect, it } from 'vitest';
import { SEED_NOW } from '@/server/index/seed';
import { confirmIntent, previewIntent } from '../../run';
import { liveRig } from '../../__tests__/rig';

const revoke = { kind: 'revoke-class', project: 'ledgerline', changes: [{ class: 'dep-bump.patch', to: 'supervised' }] };
const promote = { kind: 'promote-class', project: 'ledgerline', class: 'qa.file-bug', to: 'hands_off' };

describe('confirm: a person reads the preview before the click', () => {
  for (const intent of [revoke, promote]) {
    it(`${intent.kind} runs when confirmed 20 seconds after its preview`, async () => {
      const { deps } = await liveRig();
      let at = SEED_NOW.getTime() - 30_000; // inside one minute: 14:21:30 -> 14:21:50
      const live = { ...deps, now: () => new Date(at) };
      const p = await previewIntent(live, intent);
      if (p.status !== 'preview') throw new Error(`no preview: ${JSON.stringify(p)}`);
      at += 20_000;
      expect((await confirmIntent(live, intent, p.preview.previewId)).status).toBe('done');
    });
  }
});

import { describe, expect, it } from 'vitest';
import { probeCapabilities } from '@/server/gitlab/capabilities';
import { createDemoGitLab } from '@/server/gitlab/fake/demo';
import { LIVE_CAP_LABELS } from './liveCapabilities';

describe('LIVE_CAP_LABELS', () => {
  it("is the belay doctor's row labels, in order", async () => {
    const r = await probeCapabilities(createDemoGitLab().port, 144060371);
    expect(LIVE_CAP_LABELS).toEqual(r.capabilities.map((c) => c.label));
  });
});

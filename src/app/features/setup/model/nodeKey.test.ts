import { describe, expect, it } from 'vitest';
import { capSlug, nodeHref, nodeKey, parseNodeKey } from './nodeKey';

const CAPS = ['Pipelines, MRs, releases', 'Flow created by API (not only UI)'] as const;
const U = { steps: [0, 1, 14], tracks: ['T1', 'T8'], caps: CAPS };

describe('node keys', () => {
  it('round-trips a step, a track and a capability through the URL segment', () => {
    for (const f of [{ k: 'step', id: 14 }, { k: 'track', id: 'T8' }, { k: 'cap', id: CAPS[1] }] as const) {
      expect(parseNodeKey(nodeKey(f), U)).toEqual(f);
    }
    expect(nodeHref({ k: 'cap', id: CAPS[0] })).toBe('/setup/cap-pipelines-mrs-releases');
    expect(capSlug(CAPS[1])).toBe('flow-created-by-api-not-only-ui');
  });
  it('names nothing outside the universe', () => {
    for (const k of ['step-99', 'step-x', 'step-', 'step-014', 'step-01', 'step-+1', 'track-T9', 'track-t1', 'cap-nope', 'step', '', 'foo-1']) expect(parseNodeKey(k, U)).toBeNull();
  });
});

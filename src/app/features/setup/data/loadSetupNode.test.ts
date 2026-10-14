import { describe, expect, it } from 'vitest';
import { loadSetupNode } from './loadSetupNode';

describe('loadSetupNode', () => {
  it('finds a step, a track and a capability of the catalogue', () => {
    expect(loadSetupNode('step-0')).toEqual({ k: 'step', id: 0 });
    expect(loadSetupNode('track-T1')).toEqual({ k: 'track', id: 'T1' });
    expect(loadSetupNode('cap-pipelines-mrs-releases')).toEqual({ k: 'cap', id: 'Pipelines, MRs, releases' });
  });
  it('is null for a node the map does not hold (the page 404s)', () => {
    expect(loadSetupNode('step-15')).toBeNull();
    expect(loadSetupNode('track-T99')).toBeNull();
    expect(loadSetupNode('cap-unknown')).toBeNull();
    expect(loadSetupNode('nonsense')).toBeNull();
  });
});

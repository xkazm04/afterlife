import { afterEach, describe, expect, it } from 'vitest';
import { demoSource, setDataSource } from '@/server/data';
import { loadSetupNode } from './loadSetupNode';

afterEach(() => setDataSource(null));

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
  it('live mode resolves the doctor labels, not the demo capability names', () => {
    setDataSource({ ...demoSource, mode: 'live' });
    expect(loadSetupNode('cap-pipelines-and-jobs')).toEqual({ k: 'cap', id: 'pipelines and jobs' });
    expect(loadSetupNode('cap-merge-requests-group')).toEqual({ k: 'cap', id: 'merge requests (group)' });
    expect(loadSetupNode('step-0')).toEqual({ k: 'step', id: 0 });
    expect(loadSetupNode('cap-pipelines-mrs-releases')).toBeNull();
    expect(loadSetupNode('cap-unknown')).toBeNull();
  });
  it('demo mode keeps the demo names and does not resolve a live label', () => {
    setDataSource(demoSource);
    expect(loadSetupNode('cap-pipelines-mrs-releases')).toEqual({ k: 'cap', id: 'Pipelines, MRs, releases' });
    expect(loadSetupNode('cap-pipelines-and-jobs')).toBeNull();
  });
});

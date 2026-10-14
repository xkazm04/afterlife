import { afterEach, describe, expect, it } from 'vitest';
import { demoSource, setDataSource } from '@/server/data';
import { loadFleetProject } from './loadFleetProject';

afterEach(() => setDataSource(null));

describe('loadFleetProject', () => {
  it('finds a project by its id, with the fleet data its sections read', () => {
    setDataSource(demoSource);
    const v = loadFleetProject(demoSource.deepProjectId());
    expect(v?.project.id).toBe(demoSource.deepProjectId());
    expect(v?.data.classes.length).toBeGreaterThan(0);
    expect(v?.source.mode).toBe('demo');
  });

  it('is null for an id no project has', () => {
    setDataSource(demoSource);
    expect(loadFleetProject('no-such-project')).toBeNull();
  });
});

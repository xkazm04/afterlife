import { describe, expect, it } from 'vitest';
import { loadTasks } from './build/loadTasks';
import { clockElapsed, exhibitKinds, hasMarkup, isDenyPath, minutesOf } from './exhibits';

const tasks = loadTasks();
const get = (id: string) => {
  const t = tasks.find((x) => x.id === id);
  if (!t) throw new Error(id);
  return t;
};

describe('exhibits', () => {
  it('reads durations', () => {
    expect(minutesOf('19 h 12 m')).toBe(1152);
    expect(minutesOf('24 h')).toBe(1440);
    expect(minutesOf('45 m')).toBe(45);
    expect(minutesOf('soon')).toBe(0);
  });

  it('measures how much of the clock has run, within 0..1', () => {
    expect(clockElapsed('19 h 12 m', '24 h')).toBeCloseTo(0.2);
    expect(clockElapsed('30 h', '24 h')).toBe(0);
    expect(clockElapsed('0 m', '24 h')).toBe(1);
    expect(clockElapsed('1 h', 'nope')).toBe(0);
  });

  it('flags a CI file as a deny path unless the class changes CI config', () => {
    expect(isDenyPath({ cls: 'patch-bump' }, '.gitlab-ci.yml')).toBe(true);
    expect(isDenyPath({ cls: 'ci-config.change' }, '.gitlab-ci.yml')).toBe(false);
    expect(isDenyPath({ cls: 'patch-bump' }, 'gradle/libs.versions.toml')).toBe(false);
  });

  it('picks the exhibits each task has', () => {
    expect(exhibitKinds(get('01J8Q9'))).toEqual(['hunk']);
    expect(exhibitKinds(get('01J8QB'))).toEqual(['reruns']);
    expect(exhibitKinds(get('01J8QC'))).toEqual(['clock']);
    expect(exhibitKinds(get('01J8Q8'))).toEqual(['envelope']);
    expect(exhibitKinds(get('01J8QA'))).toEqual([]);
  });

  it('notices markup in the agent text', () => {
    expect(hasMarkup(get('01J8Q8').agentWords)).toBe(true);
    expect(hasMarkup(get('01J8Q4').agentWords)).toBe(false);
  });
});

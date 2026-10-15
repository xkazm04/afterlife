import { describe, expect, it } from 'vitest';
import type { FleetProject } from '@/lib/demo/types';
import { step } from './nav';
import type { Lead } from './types';

const lead = (group: string, ids: string[]): Lead =>
  ({ group, projects: ids.map((id) => ({ id }) as FleetProject), needs: 0, stale: 0, setup: 0, unwatched: 0, watching: 0, quar: 0 });

const leads = [lead('g1', ['a', 'b', 'c']), lead('g2', ['d', 'e']), lead('g3', ['f'])];

describe('step: arrows along and between leads', () => {
  it('moves along a lead and stops at its ends', () => {
    expect(step(leads, 'a', 'ArrowRight')).toBe('b');
    expect(step(leads, 'c', 'ArrowRight')).toBe('c');
    expect(step(leads, 'b', 'ArrowLeft')).toBe('a');
    expect(step(leads, 'a', 'ArrowLeft')).toBe('a');
  });
  it('moves to the same place on the lead above or below, and stops at the first and last lead', () => {
    expect(step(leads, 'a', 'ArrowDown')).toBe('d');
    expect(step(leads, 'c', 'ArrowDown')).toBe('e');
    expect(step(leads, 'e', 'ArrowDown')).toBe('f');
    expect(step(leads, 'e', 'ArrowUp')).toBe('c');
    expect(step(leads, 'a', 'ArrowUp')).toBe('a');
    expect(step(leads, 'f', 'ArrowDown')).toBe('f');
  });
  it('starts on the first beat when nothing (or an unknown id) is selected', () => {
    expect(step(leads, null, 'ArrowDown')).toBe('a');
    expect(step(leads, 'gone', 'ArrowLeft')).toBe('a');
  });
});

describe('step: a group with no projects', () => {
  const gap = [lead('g1', ['a', 'b']), lead('g2', []), lead('g3', ['c', 'd'])];
  it('is stepped over, not a wall, going down and up', () => {
    expect(step(gap, 'a', 'ArrowDown')).toBe('c');
    expect(step(gap, 'd', 'ArrowUp')).toBe('b');
  });
  it('does not strand the keyboard when the first group is empty', () => {
    expect(step([lead('g0', []), ...gap], null, 'ArrowDown')).toBe('a');
  });
  it('stays put when every lead below is empty', () => {
    expect(step([lead('g1', ['a']), lead('g2', [])], 'a', 'ArrowDown')).toBe('a');
  });
  it('has nowhere to go with no projects at all', () => expect(step([lead('g1', [])], null, 'ArrowDown')).toBeNull());
});

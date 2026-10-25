import { describe, expect, it } from 'vitest';
import {
  activationRefreshDue,
  afterPathname,
  copyShows,
  intentTarget,
  quietRefreshDue,
  screenKeyOf,
  staleAtStart,
  staleNote,
  type CopyView,
} from './registryRules';

const view = (v: Partial<CopyView> = {}): CopyView => ({ hasProps: true, failed: false, loading: false, fetchedAt: 1_000, stale: false, ...v });

describe('screenKeyOf', () => {
  it('is the list screen only, query, hash and trailing slash ignored', () => {
    expect(screenKeyOf('/fleet')).toBe('fleet');
    expect(screenKeyOf('/fleet/?view=class#x')).toBe('fleet');
    expect(screenKeyOf('/needs-you')).toBe('needs-you');
    expect(screenKeyOf('/monitor')).toBe('monitor');
    expect(screenKeyOf('/fleet/web')).toBeNull();
    expect(screenKeyOf('/needs-you/n2')).toBeNull();
    expect(screenKeyOf('/settings')).toBeNull();
    expect(screenKeyOf('/')).toBeNull();
  });
});

describe('intentTarget', () => {
  it('activates a copy across modules', () => {
    expect(intentTarget('/settings', '/monitor')).toBe('monitor');
    expect(intentTarget('/fleet', '/needs-you')).toBe('needs-you');
  });
  it('leaves the screen already shown to the route', () => {
    expect(intentTarget('/fleet', '/fleet')).toBeNull();
  });
  it('brings Fleet back from its own detail page (no shared store), not Needs you (the layout holds its outbox)', () => {
    expect(intentTarget('/fleet/web', '/fleet')).toBe('fleet');
    expect(intentTarget('/needs-you/n2', '/needs-you')).toBeNull();
  });
  it('ignores tabs outside the sample', () => {
    expect(intentTarget('/fleet', '/runs')).toBeNull();
  });
});

describe('afterPathname', () => {
  const held = () => true;
  const none = () => false;
  it('keeps the copy the click activated, and drops it off the sample screens', () => {
    expect(afterPathname('monitor', '/monitor', none)).toBe('monitor');
    expect(afterPathname('monitor', '/settings', held)).toBeNull();
    expect(afterPathname('fleet', '/fleet/web', held)).toBeNull();
  });
  it('shows a held copy for a screen reached another way, never a handover screen', () => {
    expect(afterPathname(null, '/fleet', held)).toBe('fleet');
    expect(afterPathname(null, '/fleet', none)).toBeNull();
    expect(afterPathname(null, '/needs-you', held)).toBeNull();
  });
});

describe('copyShows', () => {
  it('shows the active copy, a skeleton included', () => {
    expect(copyShows('monitor', 'monitor', false, view({ hasProps: false, fetchedAt: null }))).toBe(true);
    expect(copyShows('monitor', 'fleet', false, view())).toBe(false);
  });
  it('steps aside for the route when there is nothing to draw', () => {
    expect(copyShows('fleet', 'fleet', false, view({ hasProps: false, failed: true }))).toBe(false);
  });
  it('hands Needs you over once its route has landed; Fleet and Monitor stay', () => {
    expect(copyShows('needs-you', 'needs-you', true, view())).toBe(false);
    expect(copyShows('needs-you', 'needs-you', false, view())).toBe(true);
    expect(copyShows('fleet', 'fleet', true, view())).toBe(true);
  });
});

describe('refresh', () => {
  it('quietly skips a copy read in the last 3 s', () => {
    expect(quietRefreshDue(null, 0)).toBe(true);
    expect(quietRefreshDue(1_000, 3_999)).toBe(false);
    expect(quietRefreshDue(1_000, 4_000)).toBe(true);
  });
  it('refetches Needs you on every activation', () => {
    expect(activationRefreshDue('needs-you', 1_000, 1_001)).toBe(true);
    expect(activationRefreshDue('fleet', 1_000, 1_001)).toBe(false);
  });
});

describe('stale', () => {
  it('flags a Needs you refetch that replaces props older than 5 s', () => {
    expect(staleAtStart('needs-you', 1_000, 6_001)).toBe(true);
    expect(staleAtStart('needs-you', 1_000, 6_000)).toBe(false);
    expect(staleAtStart('needs-you', null, 60_000)).toBe(false);
    expect(staleAtStart('fleet', 1_000, 60_000)).toBe(false);
  });
  it('marks a stale Needs you copy while it refetches, or when the refetch failed', () => {
    expect(staleNote('needs-you', view({ loading: true, stale: true }))).toBe('updating');
    expect(staleNote('needs-you', view({ loading: true, stale: false }))).toBeNull();
    expect(staleNote('needs-you', view({ loading: false, stale: true }))).toBeNull();
    expect(staleNote('needs-you', view({ failed: true }))).toBe('failed');
  });
  it('says nothing for screens without waiting rows, or before a first read', () => {
    expect(staleNote('fleet', view({ loading: true, stale: true }))).toBeNull();
    expect(staleNote('needs-you', view({ hasProps: false, fetchedAt: null, loading: true, stale: true }))).toBeNull();
  });
});

// Fleet on the screen host, the pure half: the unread fleet, fitting the list state only once a fleet is read, when the
// list takes the URL's state, and how the read slices fold into the estate the screen draws.
import { afterEach, describe, expect, it } from 'vitest';
import { demoSource, setDataSource } from '@/server/data';
import { loadFleetData } from '../../data/loadFleetData';
import { decodeListState, encodeListState } from '../list/urlState';
import { estateOf } from './slices';
import { fitKey, fitList, listReseed, UNREAD_FLEET } from './unread';

afterEach(() => setDataSource(null));

describe('the fleet before it is read', () => {
  it('has no projects and no groups, and its tiers say not read rather than a meaning', () => {
    expect(UNREAD_FLEET.projects).toEqual([]);
    expect(UNREAD_FLEET.lastPollSec).toBeNull();
    expect(Object.values(UNREAD_FLEET.tiers).every((t) => t.means === 'not read yet')).toBe(true);
  });

  it('keeps a bookmarked group source and class sort until the fleet says it has no such group or column', () => {
    setDataSource(demoSource);
    const s = decodeListState({ src: 'g:gone', sort: 'class:nope', view: 'classes', fold: 'gone' });
    expect(fitList(s, undefined)).toBe(s);
    const fitted = fitList(s, loadFleetData());
    expect(fitted.filters.source).toBe('all');
    expect(fitted.sort.key).toBe('attention');
    expect([...fitted.collapsed]).toEqual([]);
  });

  it('keeps a group the fleet has', () => {
    setDataSource(demoSource);
    const data = loadFleetData();
    const s = decodeListState({ src: `g:${data.groups[0]}` });
    expect(fitList(s, data).filters.source).toBe(`g:${data.groups[0]}`);
  });

  it('fits again only when the fleet shape changes', () => {
    setDataSource(demoSource);
    const data = loadFleetData();
    expect(fitKey(undefined)).toBe('');
    expect(fitKey(data)).toBe(fitKey({ ...data, projects: [] }));
    expect(fitKey(data)).not.toBe(fitKey({ ...data, groups: [...data.groups, 'new'] }));
  });
});

describe('the list and the URL', () => {
  const q = (p: Record<string, string>) => encodeListState(decodeListState(p));
  it('takes the URL state on back or forward to another /fleet?.. entry', () => {
    expect(listReseed({ q: '', fit: 'k' }, q({ view: 'classes' }), 'k', '')).toBe('from');
  });
  it('changes nothing when the URL only caught up with the list, or nothing moved', () => {
    expect(listReseed({ q: '', fit: 'k' }, q({ view: 'stages' }), 'k', q({ view: 'stages' }))).toBe('fit');
    expect(listReseed({ q: 'a', fit: 'k' }, 'a', 'k', 'b')).toBeNull();
  });
  it('never takes a passing value the address bar does not show (the host between two renders of a Back)', () => {
    expect(listReseed({ q: 'view=classes', fit: 'k' }, '', 'k', 'view=classes', 'view=classes')).toBe('fit');
    expect(listReseed({ q: '', fit: 'k' }, 'view=classes', 'k', '', 'view=classes')).toBe('from');
  });
  it('fits its own state (the person’s choices kept) when the fleet lands', () => {
    expect(listReseed({ q: 'a', fit: '' }, 'a', 'k', 'b')).toBe('fit');
  });
});

describe('the estate from its slices', () => {
  it('is not read (null) until each slice is, never zero', () => {
    expect(estateOf({ state: 'unread' }, { state: 'unread' })).toEqual({ cost: null, stability: null, trend: null });
    expect(estateOf({ state: 'error', reason: 'unreadable' }, { state: 'error', reason: 'unreadable' }).cost).toBeNull();
  });
  it('takes each part as it lands', () => {
    const cost = { byProject: {}, unmatched: ['r'] };
    const signals = { stability: {}, trend: { rows: [], today: '2026-10-26', seeded: true } };
    expect(estateOf({ state: 'ok', data: signals, asOf: 'x' }, { state: 'ok', data: { cost }, asOf: 'x' })).toEqual({ cost, ...signals });
  });
});

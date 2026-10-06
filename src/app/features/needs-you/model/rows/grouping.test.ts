import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../data/pick';
import { initialState } from '../state';
import type { NeedsState } from '../types';
import { groupOf, groupsFor, isVisible, navItems, visibleGroups } from './grouping';

const demo = pickNeedsYouDemo();
const fresh = (): NeedsState => initialState(demo);
const ids = (s: NeedsState) => visibleGroups(s, demo).map((g) => `${g.id}:${g.visible.join(',')}`);

describe('grouping', () => {
  it('By kind: legal clock, extend trust, improve the project, finish setup, then the week', () => {
    expect(groupsFor('kind', fresh()).map((g) => g.id)).toEqual(['clock', 'trust', 'improve', 'setup', 'hist']);
  });
  it('By project: the repo the write lands in', () => {
    const names = groupsFor('project', fresh()).map((g) => g.name);
    expect(names.slice(0, 3)).toEqual(['acme-lab/ledgerline', 'acme-lab/belay-policy', 'GitLab settings · no write']);
  });
  it('By deadline: the clock first, then the rest oldest first', () => {
    const g = groupsFor('deadline', fresh());
    expect(g[0]?.ids).toEqual(['n2']);
    expect(g[1]?.ids).toEqual(['n5', 'n1', 'g1', 'g2', 'g3', 'g4', 'n4']);
  });
  it('every decision is in exactly one group, in every mode', () => {
    for (const mode of ['kind', 'project', 'deadline'] as const) {
      const all = groupsFor(mode, fresh()).filter((g) => !g.hist).flatMap((g) => [...g.ids]).sort();
      expect(all).toEqual(['g1', 'g2', 'g3', 'g4', 'n1', 'n2', 'n4', 'n5']);
    }
  });
  it('finds the group a row belongs to', () => {
    expect(groupOf('kind', fresh(), 'n4')?.id).toBe('trust');
    expect(groupOf('project', fresh(), 'n4')?.id).toBe('p-pol');
  });
});

describe('filtering', () => {
  it('shows the week only for All and Decided', () => {
    expect(ids(fresh()).at(-1)).toMatch(/^hist:h0,/);
    expect(ids({ ...fresh(), show: 'waiting' }).some((g) => g.startsWith('hist'))).toBe(false);
    expect(ids({ ...fresh(), show: 'sent' }).some((g) => g.startsWith('hist'))).toBe(true);
  });
  it('Waiting hides what is staged; In outbox shows only what is staged', () => {
    const staged: NeedsState = { ...fresh(), status: { ...fresh().status, n1: 'staged' } };
    expect(ids({ ...staged, show: 'waiting' }).join('|')).not.toContain('n1');
    expect(ids({ ...staged, show: 'outbox' })).toEqual(['trust:n1']);
  });
  it('searches decision titles and the ledger, case-insensitively', () => {
    expect(ids({ ...fresh(), query: 'RUNNER' })).toEqual(['setup:n5']);
    expect(isVisible({ ...fresh(), query: 'jUnit' }, 'h1', demo)).toBe(true);
    expect(isVisible({ ...fresh(), query: 'zzz' }, 'n2', demo)).toBe(false);
  });
  it('drops a group that has nothing left to show', () => {
    expect(ids({ ...fresh(), query: 'guardrail' }).map((g) => g.split(':')[0])).toEqual(['improve', 'hist']);
  });
});

describe('keyboard order', () => {
  it('lists groups, then their rows when expanded; "Decided this week" starts collapsed', () => {
    const items = navItems(visibleGroups(fresh(), demo));
    expect(items.map((i) => i.id)).toEqual(['g:clock', 'n2', 'g:trust', 'n1', 'n4', 'g:improve', 'g1', 'g2', 'g3', 'g4', 'g:setup', 'n5', 'g:hist']);
    expect(items.find((i) => i.id === 'n4')?.parent).toBe('g:trust');
  });
  it('skips the rows of a collapsed group', () => {
    const items = navItems(visibleGroups({ ...fresh(), collapsed: ['hist', 'improve'] }, demo));
    expect(items.some((i) => i.id === 'g2')).toBe(false);
    expect(items.find((i) => i.id === 'g:improve')?.expanded).toBe(false);
  });
});

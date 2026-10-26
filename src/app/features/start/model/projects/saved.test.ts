import { describe, expect, it } from 'vitest';
import { SAVED, SAVED_CFG } from '../fixtures/saved';
import { ADD_HREF, projectHref, projectsNote, projectsOf, savedDay, savedStack, selectionOf } from './saved';

const q = (s: string) => new URLSearchParams(s);

describe('the saved projects /start lists', () => {
  it('a saved config reads as the checklist the wizard drew: every saved line confirmed by its kept probe', () => {
    expect(SAVED).toMatchObject({ slug: 'acme-api', name: 'Acme API', root: SAVED_CFG.root, results: SAVED_CFG.probes });
    expect(SAVED.proposal.probes).toEqual(SAVED_CFG.probes.map(({ kind, args }) => ({ kind, args })));
    const { groups, tally } = savedStack(SAVED);
    expect(groups.map((g) => g.name)).toEqual(['Host', 'Components', 'Pipelines & variants']);
    expect(tally).toEqual({ saved: 3, total: 3, failed: 0 });
  });

  it('unread is no rows at all (a dash), never "none saved"; a refusal or a failure is a note', () => {
    expect(projectsOf({ state: 'unread' })).toEqual({});
    expect(projectsOf({ state: 'ok', data: { projects: [] } })).toEqual({ projects: [] });
    expect(projectsOf({ state: 'error', reason: 'not-local' })).toEqual({ projects: [], note: projectsNote.notLocal });
    expect(projectsOf({ state: 'error', reason: 'EACCES' }).note).toContain('EACCES');
  });

  it('the URL selects: bare or ?add=1 adds; ?project=<slug> is that project, read or not, or a missing one', () => {
    expect(selectionOf(q(''), [SAVED])).toEqual({ kind: 'add' });
    expect(selectionOf(q('add=1'), undefined)).toEqual({ kind: 'add' });
    expect(selectionOf(q('project=acme-api'), [SAVED])).toEqual({ kind: 'saved', project: SAVED });
    expect(selectionOf(q('project=acme-api'), undefined)).toEqual({ kind: 'reading', slug: 'acme-api' });
    expect(selectionOf(q('project=gone'), [SAVED])).toEqual({ kind: 'missing', slug: 'gone' });
    expect(selectionOf(q(projectHref('a b').split('?')[1]!), [])).toEqual({ kind: 'missing', slug: 'a b' });
    expect(ADD_HREF).toBe('/start?add=1');
  });

  it('the day it was saved, as written', () => {
    expect(savedDay('2026-10-21T09:00:00.000Z')).toBe('2026-10-21');
    expect(savedDay('soon')).toBe('soon');
  });
});

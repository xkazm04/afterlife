import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { demoSource, setDataSource } from '@/server/data';
import { loadFleetProject } from '../../data/loadFleetProject';
import { projectPath, revealTarget } from '../menus/contextMenus';
import { projectActions, type ProjectAction, type ProjectView } from './view';

afterEach(() => setDataSource(null));

const viewOf = (id: string): ProjectView => {
  setDataSource(demoSource);
  const v = loadFleetProject(id);
  if (!v) throw new Error(`no project ${id}`);
  return v.view;
};
const named = (actions: ProjectAction[], label: string) => actions.find((a) => a.label === label);
const notSetUp = () => demoSource.getFleet().projects.find((p) => p.state === 'not-set-up')!.id;

describe('projectView: the depth is decided once, on the server', () => {
  it('ledgerline is deep: its five decisions, the source’s four tasks and its tracks', () => {
    const { depth } = viewOf('ledgerline');
    expect(depth.kind).toBe('deep');
    expect(depth.needs.kind === 'decisions' ? depth.needs.items : null).toHaveLength(5);
    expect(depth.tasks.kind === 'list' ? depth.tasks.tasks : null).toHaveLength(4);
    expect(depth.kind === 'deep' ? depth.tracks.deep.tracks.length : 0).toBeGreaterThan(0);
  });

  it('fx-rates is a summary: a count, tasks elsewhere, no tracks, no webhooks or unattributed rows', () => {
    const { depth } = viewOf('fx-rates');
    expect(depth.kind).toBe('summary');
    expect(depth.needs).toEqual({ kind: 'count', n: 2 });
    expect(depth.tasks).toEqual({ kind: 'elsewhere', deepId: 'ledgerline' });
    expect('tracks' in depth).toBe(false);
    const labels = depth.feed.rows.map((r) => r.label);
    expect(labels).not.toContain('Webhooks');
    expect(labels).not.toContain('Unattributed');
  });
});

describe('projectActions: a flash exists only in demo mode', () => {
  it('live, fx-rates: no flash; Review queue and Open in GitLab say why they cannot', () => {
    const a = projectActions(viewOf('fx-rates'), 'live');
    expect(a.filter((x) => x.kind === 'flash')).toEqual([]);
    const review = named(a, 'Review queue');
    expect(review?.kind).toBe('disabled');
    expect(review?.kind === 'disabled' ? review.reason : '').toContain('ledgerline');
    expect(named(a, 'Open in GitLab')).toMatchObject({ kind: 'disabled', reason: 'the index stores no GitLab address yet' });
  });

  it('live, a project not set up: Set up… goes to /setup', () => {
    expect(named(projectActions(viewOf(notSetUp()), 'live'), 'Set up…')).toMatchObject({ kind: 'link', href: '/setup' });
  });

  it('demo, fx-rates: the two demo actions keep their simulation', () => {
    const a = projectActions(viewOf('fx-rates'), 'demo');
    const review = named(a, 'Review queue');
    const gitlab = named(a, 'Open in GitLab');
    expect([review?.kind, gitlab?.kind]).toEqual(['flash', 'flash']);
    expect(review?.kind === 'flash' && review.text.endsWith('(demo)')).toBe(true);
    expect(gitlab?.kind === 'flash' && gitlab.text.endsWith('(demo, no network)')).toBe(true);
  });

  it('demo, fx-rates: the page path and Open in GitLab say what the row menu says', () => {
    setDataSource(demoSource);
    const { project: p, data, view: v } = loadFleetProject('fx-rates')!;
    const path = projectPath(data.portfolio, p);
    expect(v.path).toBe(path);
    expect(named(projectActions(v, 'demo'), 'Open in GitLab')).toEqual({ label: 'Open in GitLab', ...revealTarget('demo', p, path) });
  });
});

describe('the contract', () => {
  it('no component under components/ asks whether a project is the deep one', () => {
    const root = join(__dirname, '../../components');
    const files = readdirSync(root, { recursive: true, encoding: 'utf8' }).filter((f) => /\.tsx?$/.test(f));
    const hits = files.flatMap((f) => readFileSync(join(root, f), 'utf8').split('\n').filter((l) => /deep\.id/.test(l)).map((l) => `${f}: ${l.trim()}`));
    expect(hits).toEqual([]);
  });
});

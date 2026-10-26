import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { SliceFixture, type ScreenKey } from '@/components/shell/host';
import { demoSource, setDataSource } from '@/server/data';
import { loadFleetData } from '../data/loadFleetData';
import { loadFleetSignals } from '../data/loadFleetEstate';
import { loadFleetProject, projectCore } from '../data/loadFleetProject';
import { loadFleetSource } from '../data/loadFleetSource';
import { screens } from './host';

vi.mock('next/navigation', () => ({ usePathname: () => '/fleet', useRouter: () => ({ push: () => undefined, replace: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: ReactNode }) => createElement('a', { href: p.href }, p.children) }));
afterEach(() => setDataSource(null));

const def = (key: ScreenKey) => screens.find((d) => d.key === key);
const render = (key: ScreenKey, fixture: Parameters<typeof SliceFixture>[0]['slices'], params: Record<string, string> = {}, states = {}, q = '') => {
  const Frame = def(key)?.Frame ?? (() => null);
  const html = renderToString(
    <ToastProvider>
      <SliceFixture slices={fixture} states={states}>
        <Frame params={params} search={new URLSearchParams(q)} />
      </SliceFixture>
    </ToastProvider>,
  );
  return html.replace(/<!-- -->/g, '');
};
const desk = { runner: { fleet: 'ok', rows: [], needs: [] }, cost: { byProject: {}, unmatched: [] } };

describe('Fleet on the screen host', () => {
  it('is claimed, both keys, with their slices in stream order and their titles', () => {
    expect(def('fleet')).toMatchObject({ ready: true, slices: ['core', 'estate', 'desk'] });
    expect(def('fleet/[project]')).toMatchObject({ ready: true, slices: ['core', 'estate', 'desk'] });
    expect(def('fleet')?.title({}, new URLSearchParams())).toBe('Belay Fleet');
    expect(def('fleet/[project]')?.title({ project: 'p1' }, new URLSearchParams())).toBe('Belay Fleet p1');
    expect(def('fleet/[project]')?.NotFound).toBeDefined();
  });

  it('unread: the window, toolbar, sidebar and the runner slot at once, a dash for every count, never a zero', () => {
    const html = render('fleet', {});
    expect(html).toContain('Belay');
    expect(html).toContain('Filter');
    expect(html).toContain('Cycle runner');
    expect(html).toContain('—');
    expect(html).toContain('data-reveal="wait"');
    expect(html).not.toMatch(/>0</);
    expect(html).not.toContain('No projects in the fleet yet');
    expect(html).not.toContain('not polled yet');
  });

  it('the list state comes from the URL before anything is read: a bookmarked group keeps its row', () => {
    const html = render('fleet', {}, {}, {}, 'src=g:payments&view=classes');
    expect(html).toContain('payments');
    expect(html).toMatch(/aria-pressed="true"[^>]*>Classes|Classes/);
  });

  it('core read: the fleet fills in; the runner strip still a dash until its desk lands', () => {
    setDataSource(demoSource);
    const data = loadFleetData();
    const html = render('fleet', { core: { data, source: loadFleetSource() } });
    expect(html).toContain(data.projects[0]!.name);
    expect(html).toContain('data-reveal="in"');
    expect(html).toContain('aria-label="spend not read yet"');
  });

  it('estate and desk land: the strip and the trend note', () => {
    setDataSource(demoSource);
    const html = render('fleet', { core: { data: loadFleetData(), source: loadFleetSource() }, estate: loadFleetSignals(), desk });
    expect(html).toContain('nothing to decide');
    expect(html).toMatch(/since last week|trend starts/);
  });

  it('the fleet could not be read: says why in the table', () => {
    const html = render('fleet', {}, {}, { core: { state: 'error', reason: 'BELAY_MODE=live, but the first poll has not finished' } });
    expect(html).toContain('The fleet could not be read: BELAY_MODE=live, but the first poll has not finished');
  });

  it('a project, unread: its id as the title, every card a dash, no "nothing waiting"', () => {
    const html = render('fleet/[project]', {}, { project: 'ledgerline' });
    expect(html).toContain('ledgerline');
    expect(html).toContain('Needs you');
    expect(html).toContain('—');
    expect(html).not.toContain('Nothing waiting');
    expect(html).not.toMatch(/>0 decisions/);
  });

  it('a project, read: its cards; the cost card says not read until the desk lands', () => {
    setDataSource(demoSource);
    const pv = loadFleetProject(loadFleetData().deepId)!;
    const html = render('fleet/[project]', { core: projectCore(pv) }, { project: pv.project.id });
    expect(html).toContain(pv.project.name);
    expect(html).toContain('Not read: the cycle runner');
    expect(render('fleet/[project]', { core: projectCore(pv), desk: { cost: desk.cost } }, { project: pv.project.id })).toContain('Not metered');
  });
});

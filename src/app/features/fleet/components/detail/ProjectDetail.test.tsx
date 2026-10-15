// The project page's status bar says the same thing as its lede about a stale project's waiting count: last known.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { demoSource, setDataSource } from '@/server/data';
import { loadFleetData } from '../../data/loadFleetData';
import { loadFleetSource } from '../../data/loadFleetSource';
import { makeProject } from '../../model/testProject';
import { ProjectDetail } from './ProjectDetail';

vi.mock('next/navigation', () => ({ usePathname: () => '/fleet/x', useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

afterEach(() => setDataSource(null));

const page = (over: Parameters<typeof makeProject>[0]) => {
  setDataSource(demoSource);
  const project = makeProject(over);
  const data = { ...loadFleetData(), projects: [project] };
  return renderToStaticMarkup(createElement(ToastProvider, null, createElement(ProjectDetail, { project, data, source: loadFleetSource() })));
};
const statusBar = (html: string) => html.match(/<footer[^>]*>(.*?)<\/footer>/s)?.[1] ?? '';

describe('ProjectDetail status bar', () => {
  it('counts a watching project\'s decisions plainly', () => {
    expect(statusBar(page({ id: 'x', needsYou: 2 }))).toContain('2 decisions waiting');
  });

  it('says last known for a stale project, as the lede does', () => {
    const html = page({ id: 'x', state: 'stale', needsYou: 2 });
    expect(html).toContain('2 decisions waiting · last known');
    expect(statusBar(html)).toContain('2 decisions waiting · last known');
  });

  it('counts none for an unwatched project, whose count is shown nowhere else', () => {
    expect(statusBar(page({ id: 'x', state: 'not-set-up', needsYou: 4 }))).toContain('x · 0 decisions waiting');
  });

  it('says "1 project", not "1 projects", for a one-project fleet', () => {
    expect(statusBar(page({ id: 'x' }))).toContain('1 project in the fleet');
  });
});

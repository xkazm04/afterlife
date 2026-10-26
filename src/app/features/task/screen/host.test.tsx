import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { SliceFixture } from '@/components/shell/host';
import { demoSource, setDataSource } from '@/server/data';
import { loadPageFacts } from '../model/build/loadPage';
import { loadTasks } from '../model/build/loadTasks';
import { docketRow } from '../model/docket/row';
import { screens } from './host';

vi.mock('next/navigation', () => ({ usePathname: () => '/task/01J8Q8', useRouter: () => ({ push: () => undefined, replace: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: ReactNode }) => createElement('a', { href: p.href }, p.children) }));
afterEach(() => setDataSource(null));

const def = (key: string) => screens.find((d) => d.key === key);
const render = (key: string, fixture: Parameters<typeof SliceFixture>[0]['slices'], q = '', states = {}) => {
  const d = def(key);
  const Frame = d?.Frame ?? (() => null);
  const Session = d?.Session ?? (({ children }: { children: ReactNode }) => <>{children}</>);
  return renderToString(
    <ToastProvider>
      <Session>
        <SliceFixture slices={fixture} states={states}>
          <Frame params={key === 'task' ? {} : { id: '01J8Q8' }} search={new URLSearchParams(q)} />
        </SliceFixture>
      </Session>
    </ToastProvider>,
  ).replace(/<!-- -->/g, '');
};

const read = () => {
  setDataSource(demoSource);
  const tasks = loadTasks();
  const full = tasks.find((t) => t.id === '01J8Q8')!;
  const { ledger, ledgerCheck, ...detail } = full;
  return { docket: tasks.map(docketRow), detail, ledger: { ledger, ledgerCheck }, page: loadPageFacts(), full };
};

describe('the Task screens on the screen host', () => {
  it('are claimed, with their slices in stream order and the route titles', () => {
    expect(def('task')).toMatchObject({ ready: true, slices: ['docket'] });
    expect(def('task/[id]')).toMatchObject({ ready: true, slices: ['docket', 'detail', 'ledger', 'page'] });
    expect(def('task/[id]')?.title({ id: 'Q8' }, new URLSearchParams())).toBe('Belay Task Q8');
    expect(def('task')?.Session).toBe(def('task/[id]')?.Session);
  });

  it('unread: the real window at once (toolbar, tabs, every box), a dash for every value, never a zero', () => {
    const html = render('task/[id]', {});
    expect(html).toContain('<b>Task</b>');
    for (const word of ['Court', 'Receipt chain', 'Ledger', 'Replay', 'All classes', 'verdict =', 'Docket']) expect(html).toContain(word);
    expect(html).toContain('—');
    expect(html).toContain('data-reveal="wait"');
    expect(html).toMatch(/aria-busy="true"/);
    expect(html).not.toMatch(/>0</);
    expect(html).not.toContain('No ledger rows');
  });

  it('the docket lands first: its rows and counts; the task’s boxes still dashes', () => {
    const { docket } = read();
    const html = render('task/[id]', { docket });
    expect(html).toContain(docket[0]!.title);
    expect(html).toContain('verdict =');
    expect(html).not.toContain('FAIL because');
  });

  it('the task lands: header, equation and Court; the ledger tab count and Replay wait for the ledger', () => {
    const { docket, detail, page, full } = read();
    const html = render('task/[id]', { docket, detail, page });
    expect(html).toContain(full.title);
    expect(html).toContain('FAIL because envelope');
    expect(html).toContain('ledger rows not read yet');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*title="Replay from ledger \(r\) · the ledger is not read yet"/);
  });

  it('the ledger lands: the Ledger tab (?tab=ledger) draws its rows', () => {
    const { docket, detail, ledger, page, full } = read();
    const html = render('task/[id]', { docket, detail, ledger, page }, 'tab=ledger');
    expect(html).toContain(`${full.ledger.length} rows`);
    expect(html).not.toContain('ledger rows not read yet');
  });

  it('the task could not be read: says why in the pane', () => {
    const html = render('task/[id]', {}, '', { detail: { state: 'error', reason: 'BELAY_MODE=live, but the first poll has not finished' } });
    expect(html).toContain('The task could not be read: BELAY_MODE=live, but the first poll has not finished');
  });

  it('/task: the Task window while the docket is read, then the empty docket inside it', () => {
    expect(render('task', {})).toContain('Opening the docket');
    const empty = render('task', { docket: [] });
    expect(empty).toContain('<b>Task</b>');
    expect(empty).toContain('No task is held in the docket');
  });
});

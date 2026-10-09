// The screen on the real film (the fake group's ledger) and on the illustrative one, rendered as the server would.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { setDataSource } from '@/server/data';
import { demoSource } from '@/server/data/demoSource';
import { ledgerEvents } from '@/server/gitlab/fake/demo/ledger';
import { SEED_NOW } from '@/server/index/seed';
import { TheaterScreen } from '../TheaterScreen';
import { INITIAL } from './constants';
import { REPLAY_LEDGER } from './ledger';
import { loadTheaterData } from './loadTheaterData';

vi.mock('next/navigation', () => ({ usePathname: () => '/theater', useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));
afterEach(() => setDataSource(null));

const render = (): string => renderToString(createElement(ToastProvider, null, createElement(TheaterScreen, loadTheaterData())));
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#x27;').replace(/"/g, '&quot;');
const INVENTED = REPLAY_LEDGER.flatMap((e) => [e.x, e.now ?? '']).filter(Boolean).map(esc);
const INITIAL_TEXT = [INITIAL.now, ...INITIAL.needs.map((n) => n.label)].map(esc);

describe('Theater plays a real run when the ledger names an MR', () => {
  it('the real film shows the ledger\'s events and no invented text, no INITIAL value', () => {
    setDataSource({ ...demoSource, mode: 'live', getLedger: () => ledgerEvents(SEED_NOW) });
    const page = render();
    expect(page).toContain('task_started');
    expect(page).toContain('!41');
    for (const x of INVENTED) expect(page).not.toContain(x);
    for (const x of INITIAL_TEXT) expect(page).not.toContain(x);
    expect(page).not.toContain('>30<'); // INITIAL.pass
  });

  it('an empty ledger plays the illustrative film', () => {
    setDataSource({ ...demoSource, mode: 'live', getLedger: () => [] });
    expect(loadTheaterData().film.source).toBe('illustrative');
    expect(loadTheaterData().film.entries).toEqual(REPLAY_LEDGER);
    expect(render()).toContain(esc(REPLAY_LEDGER[0]!.x));
  });

  it('demo mode always plays the illustrative film', () => {
    setDataSource(demoSource);
    expect(loadTheaterData().film.source).toBe('illustrative');
    expect(render()).toContain(esc(INITIAL.now));
  });
});

// The screen's status bar says every address the film cannot honour: `?mr=` the ledger has no events for, and a
// `#seq=` the film does not hold. Both can miss at once; neither is played in silence as another run.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { TAKES } from './data/constants';
import { REPLAY_LEDGER } from './data/ledger';
import { HOLDS } from './model/film/holds';
import type { Film } from './model/types';
import { addressNotice, TheaterScreen } from './TheaterScreen';

vi.mock('next/navigation', () => ({ usePathname: () => '/theater', useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

const film: Film = { source: 'illustrative', entries: REPLAY_LEDGER, takes: TAKES, holds: HOLDS };
const page = (f: Film): string => renderToString(createElement(ToastProvider, null, createElement(TheaterScreen, { film: f, demo: null, subtitle: 'g / p' })));

describe('the status bar names every address the film cannot honour', () => {
  it('says nothing when both are honoured', () => {
    expect(addressNotice(undefined, null)).toBeNull();
  });
  it('names a missing MR, and a missing seq, each alone', () => {
    expect(addressNotice(99, null)).toBe('!99 has no events in the ledger: the newest runs play instead.');
    expect(addressNotice(undefined, 5)).toBe('seq 5 is not on this film: take 1 plays instead.');
  });
  it('names both when both miss, not only the MR', () => {
    const n = addressNotice(99, 5);
    expect(n).toContain('!99 has no events in the ledger');
    expect(n).toContain('seq 5 is not on this film');
  });
});

describe('the address notice is a live region that is there before it speaks', () => {
  // A `#seq=` miss is found after mount (useReplayStore's effect): a role="status" inserted WITH its text is often not
  // announced, so the region is drawn empty on every film and only its text changes.
  it('draws the empty status region when nothing is missing', () => {
    expect(page(film)).toMatch(/<span role="status"><\/span>/);
  });
  it('fills that region when the MR is missing', () => {
    expect(page({ ...film, missing: 99 })).toMatch(/<span role="status">!99 has no events in the ledger[^<]*<\/span>/);
  });
});

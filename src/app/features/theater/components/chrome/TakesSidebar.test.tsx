import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { TheaterActions } from '../../hooks/useTheaterActions';
import type { Take } from '../../model/types';
import { TakesSidebar } from './TakesSidebar';

// The key map binds `1..MAX_TAKES` (useTheaterKeys); the row tooltips must name a key exactly where one is bound.
vi.mock('../../model/film/fromLedger', async (orig) => ({ ...(await orig<typeof import('../../model/film/fromLedger')>()), MAX_TAKES: 2 }));
vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

const takes: Take[] = [
  { name: 'One', a: 1, b: 2 },
  { name: 'Two', a: 3, b: 4 },
  { name: 'Three', a: 5, b: 6 },
];
const actions = {} as TheaterActions;
const html = renderToStaticMarkup(createElement(TakesSidebar, { takes, take: 0, counts: [0, 0, 0], range: { a: 1, b: 6 }, marked: false, actions }));

describe('TakesSidebar key hints follow the key map', () => {
  it('names a key for the takes the keys reach, and none past MAX_TAKES', () => {
    expect(html).toContain('seq 1–2 · key 1');
    expect(html).toContain('seq 3–4 · key 2');
    expect(html).not.toContain('key 3');
  });
});

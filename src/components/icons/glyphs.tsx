import type { ReactNode } from 'react';

export interface Glyph {
  /** viewBox width and height (also the size in px at the Smaller setting). */
  w: number;
  h: number;
  /** stroke width; 0 draws fills only. */
  sw: number;
  node: ReactNode;
}

const nav = (node: ReactNode): Glyph => ({ w: 15, h: 15, sw: 1.2, node });
const panel = (divider: string, lines: string): Glyph => ({
  w: 17,
  h: 14,
  sw: 1.2,
  node: (
    <>
      <rect x=".6" y=".6" width="15.8" height="12.8" rx="2.4" />
      <path d={divider} />
      <path d={lines} strokeLinecap="round" />
    </>
  ),
});

export const GLYPHS = {
  // app navigation (15 box)
  fleet: nav(<path d="M1.5 3.5h12M1.5 7.5h12M1.5 11.5h12" />),
  monitor: nav(<path d="M1 8h3l1.6-4 2.6 8.5 2-6.5 1.1 2H14" />),
  needsYou: nav(
    <>
      <path d="M7.5 1.5l6 11h-12z" />
      <path d="M7.5 6v3M7.5 10.6v.2" />
    </>,
  ),
  ladder: nav(<path d="M4 1.5v12M11 1.5v12M4 4.5h7M4 7.5h7M4 10.5h7" />),
  maturity: nav(
    <>
      <path d="M2 13l3.5-5 3 2.5L13 2" />
      <path d="M10 2h3v3" />
    </>,
  ),
  cycles: nav(
    <>
      <path d="M13 7.5a5.5 5.5 0 1 1-1.7-4" />
      <path d="M11.6 1v2.7H8.9" />
      <path d="M5.3 7.8l1.6 1.6 3-3.2" />
    </>,
  ),
  task: nav(
    <>
      <rect x="2" y="1.5" width="11" height="12" rx="1.5" />
      <path d="M4.5 5h6M4.5 7.5h6M4.5 10h3.5" />
    </>,
  ),
  setup: nav(
    <>
      <circle cx="7.5" cy="7.5" r="2.2" />
      <path d="M7.5 1.5v2M7.5 11.5v2M1.5 7.5h2M11.5 7.5h2M3.3 3.3l1.4 1.4M10.3 10.3l1.4 1.4M3.3 11.7l1.4-1.4M10.3 4.7l1.4-1.4" />
    </>,
  ),
  theater: nav(
    <>
      <rect x="1.5" y="2.5" width="12" height="8.5" rx="1.5" />
      <path d="M5 13.5h5" />
    </>,
  ),
  settings: nav(
    <>
      <path d="M1.5 4h5M10.5 4h3M1.5 11h2M7 11h6.5" />
      <circle cx="8.6" cy="4" r="1.8" />
      <circle cx="5.2" cy="11" r="1.8" />
    </>,
  ),
  // window chrome
  sidebarToggle: panel('M6 .6v12.8', 'M2.4 3.5h2M2.4 5.5h2M2.4 7.5h2'),
  inspectorToggle: panel('M11 .6v12.8', 'M12.6 3.5h2M12.6 5.5h2M12.6 7.5h2'),
  // toolbar
  search: {
    w: 13,
    h: 13,
    sw: 1.4,
    node: (
      <>
        <circle cx="5.5" cy="5.5" r="4.2" />
        <path d="M8.6 8.6l3.4 3.4" strokeLinecap="round" />
      </>
    ),
  },
  sort: {
    w: 12,
    h: 12,
    sw: 1.3,
    node: <path d="M3.5 1.5v9M1.5 8.5l2 2 2-2M8.5 10.5v-9M6.5 3.5l2-2 2 2" strokeLinecap="round" />,
  },
  filter: { w: 13, h: 12, sw: 1.3, node: <path d="M1 1.5h11L7.8 6.6v3.6L5.2 11V6.6z" strokeLinejoin="round" /> },
  chevDown: { w: 8, h: 6, sw: 1.4, node: <path d="M1 1.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" /> },
  // disclosure and sort arrows
  disc: { w: 8, h: 8, sw: 1.4, node: <path d="M2.5 1l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" /> },
  sortUp: { w: 8, h: 6, sw: 1.4, node: <path d="M1 4.5l3-3 3 3" strokeLinecap="round" /> },
  sortDown: { w: 8, h: 6, sw: 1.4, node: <path d="M1 1.5l3 3 3-3" strokeLinecap="round" /> },
  // objects
  folder: {
    w: 15,
    h: 13,
    sw: 1.15,
    node: (
      <>
        <path d="M1 2.6c0-.9.6-1.5 1.5-1.5h3l1.4 1.5h5.6c.9 0 1.5.6 1.5 1.5v6.8c0 .9-.6 1.5-1.5 1.5h-10c-.9 0-1.5-.6-1.5-1.5z" />
        <path d="M1 4.6h13" />
      </>
    ),
  },
  diamond: { w: 12, h: 12, sw: 0, node: <path d="M6 1l5 5-5 5-5-5z" fill="currentColor" /> },
  check: { w: 11, h: 11, sw: 1.7, node: <path d="M2 6l2.6 2.6L9.4 3" strokeLinecap="round" strokeLinejoin="round" /> },
  close: { w: 10, h: 10, sw: 1.4, node: <path d="M2 2l6 6M8 2L2 8" strokeLinecap="round" /> },
} satisfies Record<string, Glyph>;

export type IconName = keyof typeof GLYPHS;

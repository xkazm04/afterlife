// Media-transport marks (Task's replay, Theater's transport and Present), spread into GLYPHS: the registry's own file sits
// at the 200-line ceiling, and these belong together. Each renders through <Icon>, which scales it with --ui-scale.
import type { Glyph } from './glyphs';

export const TRANSPORT_GLYPHS = {
  play: { w: 11, h: 12, sw: 0, node: <path d="M2 1.3v9.4L9.6 6z" fill="currentColor" /> },
  pause: { w: 11, h: 11, sw: 0, node: <path d="M2.5 1.5h2v8h-2zM6.5 1.5h2v8h-2z" fill="currentColor" /> },
  loop: { w: 13, h: 11, sw: 1.3, node: <path d="M2 6.5V5a2.5 2.5 0 0 1 2.5-2.5h7M9.5.8l2 1.7-2 1.7M11 4.5V6a2.5 2.5 0 0 1-2.5 2.5h-7M3.5 10.2l-2-1.7 2-1.7" /> },
  present: {
    w: 14,
    h: 12,
    sw: 1.2,
    node: (
      <>
        <rect x=".6" y=".6" width="12.8" height="8.4" rx="1.4" />
        <path d="M4.5 11.2h5" />
      </>
    ),
  },
} satisfies Record<string, Glyph>;

import type { ReactNode } from 'react';
import type { GlyphKind } from '../../model/rows/rowState';

const BODY: Record<GlyphKind, ReactNode> = {
  wait: <path d="M5 .8l4.2 4.2L5 9.2.8 5z" fill="var(--needs-you)" />,
  stg: <path d="M5 1.3l3.7 3.7L5 8.7 1.3 5z" fill="none" stroke="var(--accent)" strokeWidth="1.3" />,
  ok: <path d="M1.6 5.3l2.2 2.2 4.6-5" fill="none" stroke="var(--ok)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
  unk: <circle cx="5" cy="5" r="3.9" fill="none" stroke="var(--unknown)" strokeWidth="1.1" strokeDasharray="2 1.6" />,
  dash: <path d="M2 5h6" stroke="var(--text-4)" strokeWidth="1.4" strokeLinecap="round" />,
  open: <circle cx="5" cy="5" r="3.6" fill="none" stroke="var(--text-4)" strokeWidth="1.2" />,
};

/** The 10 px state glyph of a decision: waiting, staged, done, unknown, set aside, open. */
export function DecisionGlyph({ kind }: { kind: GlyphKind }) {
  const size = 'calc(10px * var(--ui-scale))';
  return (
    <svg viewBox="0 0 10 10" style={{ width: size, height: size, flex: 'none', display: 'block' }} aria-hidden="true">
      {BODY[kind]}
    </svg>
  );
}

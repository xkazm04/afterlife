import type { MarkKind } from '../../model/words';

const box = (style: React.CSSProperties) => {
  const [a, b, h, cx, cy] = [11, 5.5, 13, 15, 21];
  const d = `M${cx - a} ${cy} L${cx - a} ${cy - h} L${cx} ${cy - b - h} L${cx + a} ${cy - h} L${cx + a} ${cy} L${cx} ${cy + b} Z M${cx} ${cy + b} L${cx} ${cy + b - h} M${cx - a} ${cy - h} L${cx} ${cy + b - h} L${cx + a} ${cy - h}`;
  return <path d={d} style={style} />;
};

/** The answer's drawn marks, in the city's own vocabulary: a hatched tile, a Q, a dashed or solid little tower, a tick. */
export function MarkIcon({ kind }: { kind: MarkKind | 'proof' }) {
  let body;
  if (kind === 'stale') body = <rect x="3" y="3" width="24" height="24" rx="3" style={{ fill: 'url(#d-hatch)', stroke: 'var(--stale)' }} />;
  else if (kind === 'quar')
    body = (
      <>
        <rect x="2" y="2" width="26" height="26" rx="4" style={{ fill: 'color-mix(in oklab, var(--tier-quarantined) 22%, transparent)', stroke: 'var(--tier-quarantined)' }} />
        <text x="15" y="21.5" textAnchor="middle" style={{ font: '700 18px var(--sys)', fill: 'var(--tier-quarantined)' }}>
          Q
        </text>
      </>
    );
  else if (kind === 'setup') body = box({ fill: 'none', stroke: 'var(--accent)', strokeDasharray: '2.5 2' });
  else if (kind === 'nsu') body = box({ fill: 'none', stroke: 'var(--unknown)', strokeDasharray: '3 2.5' });
  else if (kind === 'watch') body = box({ fill: 'var(--d-f-l)', stroke: 'var(--accent)' });
  else if (kind === 'proof') body = <path d="M6 16 L12 22 L24 8" style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }} />;
  else body = <path d="M15 3 L27 15 L15 27 L3 15 Z" style={{ fill: 'var(--needs-you)' }} />;
  return (
    <svg viewBox="0 0 30 30" aria-hidden>
      {body}
    </svg>
  );
}

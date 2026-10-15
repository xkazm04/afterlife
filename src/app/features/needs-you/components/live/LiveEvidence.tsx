import type { LiveEvidence as Evidence } from '../../model/evidence/evidence';
import styles from './live.module.css';

const Mr = ({ iid, href }: { iid: number; href: string | null }) =>
  href ? <a href={href} target="_blank" rel="noreferrer">!{iid}</a> : <>!{iid}</>;

/**
 * The class behind a live promotion or re-admit, as the snapshot holds it now: a move since the proposal (Run is closed
 * then), the tier, the record, the newest counted outputs one click from GitLab, the guardrail blocks, the gate, and a
 * re-admit's trigger. A class the index does not hold says so; nothing is drawn that the snapshot does not state.
 */
export function LiveEvidence({ evidence: e }: { evidence: Evidence }) {
  if (e.kind === 'missing') return <div className={styles.note}>{e.line}</div>;
  return (
    <section className={styles.evidence} aria-label={`${e.cls} as it is now`}>
      {e.movedLine ? <div role="alert" className={styles.bad}>{e.movedLine}</div> : null}
      {e.stale ? <div className={styles.bad}>{e.stale}</div> : null}
      {e.trigger ? <div>Last move: {e.trigger}</div> : null}
      {e.record ? <div className={styles.mono}>Now: {e.record}</div> : null}
      {e.outputs.length ? (
        <ul className={styles.outputs} aria-label={`The newest counted outputs${e.demo ? ' (demo, illustrative)' : ''}`}>
          {e.outputs.map((o) => (
            <li key={o.iid}>
              <Mr iid={o.iid} href={o.href} /> {o.text}
              {o.edited ? ' · edited' : ''}
              {o.gated ? ' · gated' : ''}
            </li>
          ))}
          {e.more ? <li className={styles.note}>and {e.more} more counted</li> : null}
        </ul>
      ) : null}
      {e.outputsLine ? <div className={styles.note}>{e.outputsLine}</div> : null}
      {e.blocks.length ? (
        <div>
          Guardrail blocks:{' '}
          {e.blocks.map((b, i) => (
            <span key={b.iid}>
              {i ? ', ' : ''}
              <Mr iid={b.iid} href={b.href} />
            </span>
          ))}
        </div>
      ) : null}
      {e.gate ? <div className={styles.note}>{e.gate}</div> : null}
    </section>
  );
}

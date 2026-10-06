import styles from './GateRow.module.css';

// kit-candidate: GateRow (notes/setup.md lists .gate)
/** A thing only you can do: an amber number, its title, what it frees underneath, a tag on the right. */
export function GateRow({ glyph, title, sub, tag, onGo }: { glyph: string | number; title: string; sub: string; tag: string; onGo: () => void }) {
  return (
    <button type="button" className={styles.gate} onClick={onGo}>
      <span className={styles.gl}>{glyph}</span>
      <span className={styles.t}>{title}</span>
      <span className={styles.s}>{tag}</span>
      <span className={styles.m}>{sub}</span>
    </button>
  );
}

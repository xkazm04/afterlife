import { Filigree } from './Filigree';
import ins from './inlay.module.css';
import styles from './leaf.module.css';

/**
 * One gate leaf: a graphite slab with a raised stile and a deep recessed field, hinges on the outer edge, the circuit
 * filigree (dim at rest, then charged by a current that sweeps from the hinge to the lock), half of the lock plate and
 * two bolts on the seam, the warm spill of the treasure light and the leaf's thickness, seen as it swings. Authored as
 * the left leaf; the right one is its mirror.
 */
export function Leaf({ side }: { side: 'l' | 'r' }) {
  return (
    <div className={`${styles.leaf} ${side === 'l' ? styles.l : styles.r}`}>
      <div className={styles.face}>
        <div className={styles.panel}>
          <div className={styles.field} />
          <Filigree />
          <div className={styles.sweep}>
            <div className={styles.sweepIn}>
              <Filigree lit />
            </div>
          </div>
          <div className={styles.front} data-lite="off">
            <i className={styles.bar} />
          </div>
          <PlateHalf />
          {[ins.slotA, ins.slotB].map((c) => (
            <div key={c} className={`${ins.slot} ${c}`}>
              <i className={ins.bolt} />
            </div>
          ))}
          {[ins.hA, ins.hB, ins.hC].map((c) => (
            <i key={c} className={`${ins.hinge} ${c}`} />
          ))}
          <div className={styles.warm} />
          <div className={styles.shade} />
        </div>
        <div className={styles.edge} />
      </div>
    </div>
  );
}

/** Half a hexagon of radius r (pointy-top, centred on the seam at 0, 0): the left half, open along the seam. */
const half = (r: number) => `M0 ${-r}L${-0.866 * r} ${-r / 2}V${r / 2}L0 ${r}`;
const RIVETS: readonly (readonly [number, number])[] = [
  [-80.5, -46.5],
  [-80.5, 46.5],
  [-80.5, 0],
  [-40.2, -69.7],
  [-40.2, 69.7],
];

/** The leaf's half of the lock plate: a bevelled hex escutcheon with rivets, a cyan inlay and an amber well. */
function PlateHalf() {
  return (
    <svg className={ins.plate} viewBox="-100 -110 100 220" aria-hidden>
      <path className={ins.pBody} d={`${half(100)}Z`} />
      <path className={ins.pLip} d={half(94)} />
      <path className={ins.pInlay} d={half(87)} />
      <path className={ins.pWell} d={`${half(79)}Z`} />
      <path className={ins.pAmber} d={half(73)} />
      {RIVETS.map(([x, y]) => (
        <circle key={`${x}${y}`} className={ins.rivet} cx={x} cy={y} r="2.6" />
      ))}
    </svg>
  );
}

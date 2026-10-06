import type { EdgeSpec } from '../../model/map/edges';
import styles from './EdgeLayer.module.css';

/**
 * The drawn edges behind the nodes. Needs are cyan once met, track-to-track violet, unknown capabilities dashed.
 * While something is lit (`dim`), the rest fades and the lit edges glow; an edge waiting on a gate of yours is amber.
 */
export function EdgeLayer({ edges, dim }: { edges: readonly EdgeSpec[]; dim: boolean }) {
  return (
    <svg className={styles.edges} data-dim={dim} aria-hidden="true">
      {edges.map((e) => {
        const cls = [styles.e, e.kind === 'dep' ? styles.dep : '', e.met ? styles.met : '', e.unknown ? styles.unk : '', e.hot ? styles.hot : '', e.wait ? styles.wait : ''];
        return <path key={e.id} className={cls.filter(Boolean).join(' ')} d={e.d} />;
      })}
    </svg>
  );
}

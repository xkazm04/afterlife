import { CAP_SHORT } from '../../../data/capabilities';
import { CapGlyph } from '../../shared/CapGlyph';
import type { Lit } from '../../../model/map/hot';
import type { DoctorRow } from '../../../model/types';
import { MapNode } from './MapNode';
import type { NodeEvents } from './nodeTypes';
import styles from './nodes.module.css';

/** `note`: why the probe says so (live: the row's reason; demo: the catalogue's note), as the capability's page says it. */
export function CapNode({ row, note, lit, events }: { row: DoctorRow; note?: string; lit: Lit; events: NodeEvents }) {
  return (
    <MapNode focus={{ k: 'cap', id: row.name }} lit={lit} tip={`${row.name} · ${row.st}${note ? ` · ${note}` : ''}`} events={events} className={`${styles.cn} ${styles[row.st] ?? ''}`}>
      <CapGlyph st={row.st} />
      <span className={styles.lb}>{CAP_SHORT[row.name] ?? row.name}</span>
    </MapNode>
  );
}

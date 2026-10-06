import { CAP_SHORT } from '../../../data/capabilities';
import { CapGlyph } from '../../shared/CapGlyph';
import type { Lit } from '../../../model/map/hot';
import type { DoctorRow } from '../../../model/types';
import { MapNode } from './MapNode';
import type { NodeEvents } from './nodeTypes';
import styles from './nodes.module.css';

export function CapNode({ row, selected, lit, events }: { row: DoctorRow; selected: boolean; lit: Lit; events: NodeEvents }) {
  return (
    <MapNode focus={{ k: 'cap', id: row.name }} selected={selected} lit={lit} tip={`${row.name} · ${row.st}`} events={events} className={`${styles.cn} ${styles[row.st] ?? ''}`}>
      <CapGlyph st={row.st} />
      <span className={styles.lb}>{CAP_SHORT[row.name] ?? row.name}</span>
    </MapNode>
  );
}

import { CAP_SHORT } from '../../../data/capabilities';
import { Unread } from '@/components/shell/host';
import { CapGlyph } from '../../shared/CapGlyph';
import type { Lit } from '../../../model/map/hot';
import type { DoctorRow } from '../../../model/types';
import { MapNode } from './MapNode';
import type { NodeEvents } from './nodeTypes';
import styles from './nodes.module.css';

/** `note`: why the probe says so (live: the row's reason; demo: the catalogue's note), as the capability's page says it. */
export function CapNode({ row, note, lit, events, unread = false }: { row: DoctorRow; note?: string; lit: Lit; events: NodeEvents; unread?: boolean }) {
  return (
    <MapNode focus={{ k: 'cap', id: row.name }} lit={lit} tip={`${row.name} · ${unread ? 'not probed yet' : row.st}${note ? ` · ${note}` : ''}`} events={events} className={`${styles.cn} ${unread ? '' : (styles[row.st] ?? '')}`}>
      {unread ? <Unread label={`${row.name} not probed yet`} /> : <CapGlyph st={row.st} />}
      <span className={styles.lb}>{CAP_SHORT[row.name] ?? row.name}</span>
    </MapNode>
  );
}

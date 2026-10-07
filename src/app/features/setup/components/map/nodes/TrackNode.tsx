import { Spinner } from '../../shared/Spinner';
import type { Lit } from '../../../model/map/hot';
import type { ArmState, SetupState } from '../../../model/types';
import { trackWhy } from '../../../model/flow/wording';
import { MapNode } from './MapNode';
import type { NodeEvents } from './nodeTypes';
import styles from './nodes.module.css';

const LOCK = (
  <svg width="8" height="10" viewBox="0 0 8 10" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
    <rect x=".6" y="4.2" width="6.8" height="5.2" rx="1" />
    <path d="M2 4.2V3a2 2 0 0 1 4 0v1.2" />
  </svg>
);

function Status({ a }: { a: ArmState }) {
  if (a.st === 'armed') return <>✓ {a.mr ?? 'armed'}</>;
  if (a.st === 'ready') return <>ready</>;
  if (a.st === 'open')
    return (
      <span className={styles.ny}>
        {a.revert ? 'revert' : 'merge'} {a.mr ?? 'MR'}
      </span>
    );
  if (a.st === 'probing') return <Spinner />;
  if (a.st === 'undefined') return <>not defined</>;
  if (a.st === 'unknown') return <>? unknown</>;
  return (
    <>
      {LOCK}locked
    </>
  );
}

export function TrackNode({ arm, name, state, selected, lit, events }: { arm: ArmState; name: string; state: SetupState; selected: boolean; lit: Lit; events: NodeEvents }) {
  const tip = `#${arm.order + 1} · ${trackWhy(state, arm)}`;
  return (
    <MapNode focus={{ k: 'track', id: arm.id }} selected={selected} lit={lit} tip={tip} events={events} className={`${styles.tn} ${styles[arm.st] ?? ''}`}>
      <span className={styles.id}>{arm.id}</span>
      <span className={styles.lb}>{name}</span>
      <span className={styles.st}>
        <Status a={arm} />
      </span>
    </MapNode>
  );
}

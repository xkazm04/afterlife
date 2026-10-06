import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { TierChip } from '@/components/status/TierChip';
import { Chip } from '@/components/status/chip/Chip';
import { ObjectLink } from '@/components/controls/ObjectLink';
import type { TaskView } from '../../model/types';
import styles from './TaskHeader.module.css';

/** Title, the tier it had then versus now, its state, and where it came from. Today's tier never rewrites the task. */
export function TaskHeader({ task }: { task: TaskView }) {
  const tierNow = task.tierNow && task.tierNow !== task.tierAtTime ? task.tierNow : null;
  return (
    <div className={styles.hd}>
      <h1 className={styles.h1} title={task.title}>
        {task.title}
      </h1>
      <div className={styles.chips}>
        <span className={styles.tl}>then</span>
        <TierChip tier={task.tierAtTime} />
        {tierNow ? (
          <>
            <span className={styles.tl}>now</span>
            <span title="today's tier; it does not rewrite this task">
              <TierChip tier={tierNow} />
            </span>
          </>
        ) : null}
        <Chip>{task.state}</Chip>
        {task.seeded ? <HonestyChip kind="seeded" /> : null}
      </div>
      <div className={styles.crumb}>
        {task.track} {task.trackName} · {task.mr ? <ObjectLink target={task.mr} label={`MR ${task.mr}`} /> : 'no MR'} · {task.id} · {task.cls}
      </div>
    </div>
  );
}

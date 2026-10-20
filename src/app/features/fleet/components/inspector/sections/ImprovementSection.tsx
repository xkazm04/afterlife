import { Button } from '@/components/controls/Button';
import { DetailSection } from '@/components/shell/detail/DetailPage';
import type { FleetProject } from '@/lib/demo/types';
import type { DeepProject } from '../../../model/types';
import styles from './sections.module.css';

/**
 * Where the project stands in the improvement loop: in cycles (with what they have earned), ready to start one, or
 * still to be onboarded. Every answer is a way into the screen that moves it on. `cycle` is the deep project's cycle
 * history (the only project with one); null for every other project.
 */
export function ImprovementSection({ p, cycle }: { p: FleetProject; cycle: DeepProject['cycle'] | null }) {
  const ready = p.state === 'watching' || p.state === 'stale';
  return (
    <DetailSection title="Improvement" aux={cycle ? `${cycle.closed} cycles` : ready ? 'not started' : 'onboard first'}>
      {cycle ? (
        <div className={styles.imp}>
          <p>
            <b>+{cycle.gained}</b> rungs since day 0 · <b>{cycle.held}</b> of 36 held
            {cycle.running ? ` · ${cycle.running} running` : ''}
          </p>
          <Button size="mini" href="/cycles">
            Open Cycles
          </Button>
        </div>
      ) : ready ? (
        <div className={styles.imp}>
          <p>Watched, not in a cycle yet: arming T6 opens its cycle C1 (one MR in belay-policy, as you).</p>
          <Button size="mini" href="/onboard">
            Start in Onboard
          </Button>
        </div>
      ) : (
        <div className={styles.imp}>
          <p>Cycles start once it is watched: scan, pair and poll it first.</p>
          <Button size="mini" href="/onboard">
            Onboard it
          </Button>
        </div>
      )}
    </DetailSection>
  );
}

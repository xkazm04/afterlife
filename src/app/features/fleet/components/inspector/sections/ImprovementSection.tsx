import { Button } from '@/components/controls/Button';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import type { FleetProject } from '@/lib/demo/types';
import type { SectionProps } from '../../../hooks/useSectionOpen';
import type { DeepProject } from '../../../model/types';
import styles from './sections.module.css';

/**
 * Where the project stands in the improvement loop: in cycles (with what they have earned), ready to start one, or
 * still to be onboarded. Every answer is a way into the screen that moves it on.
 */
export function ImprovementSection({ p, deep, sec }: { p: FleetProject; deep: DeepProject; sec: SectionProps }) {
  const inCycles = p.id === deep.id;
  const ready = p.state === 'watching' || p.state === 'stale';
  return (
    <InspectorSection title="Improvement" aux={inCycles ? `${deep.cycle.closed} cycles` : ready ? 'not started' : 'onboard first'} {...sec}>
      {inCycles ? (
        <div className={styles.imp}>
          <p>
            <b>+{deep.cycle.gained}</b> rungs since day 0 · <b>{deep.cycle.held}</b> of 36 held
            {deep.cycle.running ? ` · ${deep.cycle.running} running` : ''}
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
    </InspectorSection>
  );
}

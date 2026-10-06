'use client';

import { Button } from '@/components/controls/Button';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import { NeedYouAux } from './parts/NeedYouAux';
import { useToast } from '@/components/overlays/toast/useToast';
import { useSetup } from '../../hooks/SetupContext';
import { needLabel, unmet } from '../../model/flow/state';
import { armCmd, disarmCmd } from '../../model/flow/wording';
import styles from './inspector.module.css';
import { ProbeLine } from './parts/ProbeLine';
import type { SectionProps } from './parts/useOpenSections';

/**
 * The one section that changes with the track's state: Arm (ready), Merge (open), Disarm (armed), Verify
 * (probing), or why it is Locked. Every write shows its exact command first and goes out only on a click.
 */
export function TrackArmSection({ id, section }: { id: string; section: (key: string) => SectionProps }) {
  const { state, tracks, actions, view } = useSetup();
  const { toast } = useToast();
  const a = state.arm[id];
  const t = tracks[id];
  if (!a || !t) return null;

  if (a.st === 'ready') {
    return (
      <InspectorSection title="Arm" aux="preview · nothing sent" {...section('arm')}>
        <CommandBlock commands={[armCmd(id, t.key), { note: `# opens ${t.armedBy} as @you · one MR, so a revert disarms` }]} />
        <div className={styles.acts}>
          <Button variant="accent" onClick={() => actions.armSend(id)}>
            Arm · send as you
          </Button>
          <Button onClick={() => actions.armCopy(id)}>Copy</Button>
          <Button
            onClick={() => {
              toast(`Skipped ${id} · nothing sent`);
              view.clear();
            }}
          >
            Skip
          </Button>
        </div>
      </InspectorSection>
    );
  }
  if (a.st === 'open') {
    return (
      <InspectorSection title={`Merge ${a.mr}${a.revert ? ' (revert)' : ''}`} aux={<NeedYouAux />} {...section('arm')}>
        <KeyValue rows={[['Do', `Merge ${a.mr} in GitLab`], ['Why you', 'Belay never holds a merge token']]} />
        <div className={styles.acts}>
          <Button onClick={() => actions.openMr(id)}>Open {a.mr} ↗</Button>
          <Button variant="primary" onClick={() => void actions.armVerify(id)}>
            I merged it · verify
          </Button>
        </div>
      </InspectorSection>
    );
  }
  if (a.st === 'armed') {
    return (
      <InspectorSection title="Disarm" aux="one click · restricting is free" {...section('arm')}>
        <CommandBlock commands={[disarmCmd(id, t.key, a.mr)]} />
        <div className={styles.acts}>
          <Button onClick={() => actions.disarm(id)}>Disarm · send as you</Button>
        </div>
      </InspectorSection>
    );
  }
  if (a.st === 'probing') {
    return (
      <InspectorSection title="Verify" {...section('arm')}>
        <ProbeLine probe={null} busy what={`main for ${a.mr}`} />
      </InspectorSection>
    );
  }
  return (
    <InspectorSection title="Locked" {...section('arm')}>
      <div className={styles.muted}>Stays locked until a probe sees {unmet(state, id).map(needLabel).join(', ')}</div>
    </InspectorSection>
  );
}

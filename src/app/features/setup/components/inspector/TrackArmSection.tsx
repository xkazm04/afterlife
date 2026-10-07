'use client';

import { useEffect } from 'react';
import { Button } from '@/components/controls/Button';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import { NeedYouAux } from './parts/NeedYouAux';
import { useToast } from '@/components/overlays/toast/useToast';
import { useSetup } from '../../hooks/SetupContext';
import { needLabel, unmet } from '../../model/flow/state';
import { mrName } from '../../model/flow/wording';
import styles from './inspector.module.css';
import { ArmPreview } from './parts/ArmPreview';
import { ProbeLine } from './parts/ProbeLine';
import type { SectionProps } from './parts/useOpenSections';

/**
 * The one section that changes with the track's state: Arm (ready), Merge (open), Disarm (armed), Verify
 * (probing), or why it is Locked. Arm and Disarm show the server's planned MR first and send it only on a click.
 */
export function TrackArmSection({ id, section }: { id: string; section: (key: string) => SectionProps }) {
  const { state, tracks, actions, view, writes } = useSetup();
  const { toast } = useToast();
  const a = state.arm[id];
  const t = tracks[id];
  const plan = a?.st === 'ready' ? false : a?.st === 'armed' ? true : null;
  const { want, round, viewOf } = writes;
  useEffect(() => {
    if (plan !== null) want(id, plan);
  }, [id, plan, want, round]);
  if (!a || !t) return null;

  if (plan !== null) {
    const w = viewOf(id, plan);
    const ready = w?.kind === 'preview';
    return (
      <InspectorSection title={plan ? 'Disarm' : 'Arm'} aux={plan ? 'one MR · the revert' : 'preview · nothing sent'} {...section('arm')}>
        <ArmPreview view={w} />
        <div className={styles.acts}>
          <Button variant={plan ? undefined : 'accent'} disabled={!ready} onClick={() => void (plan ? actions.disarm(id) : actions.armSend(id))}>
            {plan ? 'Disarm' : 'Arm'} · send as you
          </Button>
          <Button disabled={!ready} onClick={() => actions.armCopy(id, plan)}>
            Copy
          </Button>
          {plan ? null : (
            <Button
              onClick={() => {
                toast(`Skipped ${id} · nothing sent`);
                view.clear();
              }}
            >
              Skip
            </Button>
          )}
        </div>
      </InspectorSection>
    );
  }
  const mr = mrName(a);
  if (a.st === 'open') {
    const rows: [string, string][] = [['Do', `Merge ${mr} in GitLab`], ['Why you', 'Belay never holds a merge token']];
    if (a.simulated) rows.push(['Simulated', 'demo mode: nothing was sent to GitLab']);
    if (a.found) rows.push(['Last verify', a.found]);
    return (
      <InspectorSection title={`Merge ${mr}${a.revert ? ' (revert)' : ''}`} aux={<NeedYouAux />} {...section('arm')}>
        <KeyValue rows={rows} />
        <div className={styles.acts}>
          <Button disabled={!a.url} onClick={() => actions.openMr(id)}>
            Open {mr} ↗
          </Button>
          <Button variant="primary" onClick={() => void actions.armVerify(id)}>
            I merged it · verify
          </Button>
        </div>
      </InspectorSection>
    );
  }
  if (a.st === 'probing') {
    return (
      <InspectorSection title="Verify" {...section('arm')}>
        <ProbeLine probe={null} busy what={`main for ${mr}`} />
      </InspectorSection>
    );
  }
  return (
    <InspectorSection title="Locked" {...section('arm')}>
      <div className={styles.muted}>Stays locked until a probe sees {unmet(state, id).map(needLabel).join(', ')}</div>
    </InspectorSection>
  );
}

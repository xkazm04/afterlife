'use client';

import { useEffect } from 'react';
import { Button } from '@/components/controls/Button';
import { KeyValue } from '@/components/inspector/KeyValue';
import { DetailSection } from '@/components/shell/detail/DetailPage';
import { useToast } from '@/components/overlays/toast/useToast';
import { useSetup } from '../../hooks/SetupContext';
import { enrollGate, enrollWhyNot } from '../../model/enroll/enroll';
import { mrName, noMrAddress } from '../../model/flow/wording';
import styles from './inspector.module.css';
import { ArmPreview } from './parts/ArmPreview';
import { NeedYouAux } from './parts/NeedYouAux';

/**
 * Enroll: after a track's arm verifies, its classes still hold no record, so the gate blocks every one of their MRs.
 * This section asks the server for the policy MR that writes their first records (start_tier, never above a ceiling),
 * shows it whole, and sends it only on the click; a person merges it in belay-policy. Otherwise it says why not.
 */
export function EnrollSection({ id }: { id: string }) {
  const { state, classes, enroll } = useSetup();
  const { toast, status } = useToast();
  const gate = enrollGate(state.arm[id]?.st, classes.filter((c) => c.track === id));
  const open = gate.kind === 'open';
  const { want } = enroll;
  useEffect(() => {
    if (open) want(id);
  }, [id, open, want]);

  const sent = enroll.sentOf(id);
  if (sent) {
    const mr = mrName(sent);
    const rows: [string, string][] = [['Do', `Merge ${mr} in belay-policy`], ['Why you', 'Raising a tier is a policy MR a person merges; Afterlife never does']];
    if (sent.simulated) rows.push(['Simulated', 'demo mode: nothing was sent to GitLab']);
    return (
      <DetailSection title={`Merge ${mr}`} aux={<NeedYouAux />}>
        <KeyValue rows={rows} />
        <div className={styles.acts}>
          <Button onClick={() => (sent.url ? window.open(sent.url, '_blank', 'noopener,noreferrer') : toast(noMrAddress(sent.simulated, mr)))}>
            Open {mr} ↗
          </Button>
        </div>
      </DetailSection>
    );
  }
  if (!open) {
    return (
      <DetailSection title="Enroll">
        <div className={styles.muted}>{enrollWhyNot(gate, id)}</div>
      </DetailSection>
    );
  }
  const w = enroll.viewOf(id);
  return (
    <DetailSection title="Enroll" aux="policy MR · preview · nothing sent">
      <ArmPreview view={w} />
      <div className={styles.acts}>
        <Button
          variant="accent"
          disabled={w?.kind !== 'preview'}
          onClick={() =>
            void enroll.send(id).then((text) => {
              status(text);
              toast(text);
            })
          }
        >
          Enroll · send as you
        </Button>
      </div>
    </DetailSection>
  );
}

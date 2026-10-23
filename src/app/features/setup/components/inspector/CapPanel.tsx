'use client';

import { Button } from '@/components/controls/Button';
import { DetailSection } from '@/components/shell/detail/DetailPage';
import { CAP_USES } from '../../data/capabilities';
import { useSetup } from '../../hooks/SetupContext';
import { capSt } from '../../model/flow/state';
import { CapGlyph } from '../shared/CapGlyph';
import { Chip } from '@/components/status/chip/Chip';
import { Spinner } from '../shared/Spinner';
import styles from './inspector.module.css';
import { TrackDep } from './parts/TrackDep';

/** A picked GitLab capability: its belay doctor status, a Re-probe, and the tracks that rely on it (illustrative). */
export function CapPanel({ name }: { name: string }) {
  const { state, actions } = useSetup();
  const st = capSt(state, name);
  // A re-probe that failed over an earlier read leaves that read's rows: the status is the last good one, and says so.
  const lastGood = !!state.doctorError && !state.doctorNever;
  const uses = state.live ? [] : (CAP_USES[name] ?? []);
  return (
    <>
      <DetailSection title="State" aux={<CapGlyph st={st} size={14} />}>
        <div className={styles.chips}>
          <Chip tone={st === 'available' ? 'ok' : st === 'unknown' ? 'unknown' : 'bad'}>{lastGood ? `${st} · last good read` : st}</Chip>
          <Chip>belay doctor · {state.group}</Chip>
        </div>
      </DetailSection>
      <DetailSection title="Probe" aux={state.doctorNever ? 'never probed' : state.doctorError ? `probe failed ${state.doctorProbedAt}` : state.doctorProbedAt}>
        {state.doctorError ? <div className={styles.err}>{`belay doctor: ${state.doctorError}`}</div> : null}
        <Button disabled={state.doctorBusy} onClick={() => void actions.reprobe()}>
          {state.doctorBusy ? (
            <>
              <Spinner /> probing
            </>
          ) : (
            'Re-probe the group'
          )}
        </Button>
      </DetailSection>
      <DetailSection title="Tracks that rely on it" aux={uses.length ? `${uses.length} · illustrative` : undefined}>
        {uses.length ? (
          uses.map((id) => <TrackDep key={id} id={id} />)
        ) : (
          <div className={styles.muted}>{state.live ? 'Not mapped: Belay does not tie a live probe to the tracks yet' : 'No track relies on it'}</div>
        )}
      </DetailSection>
    </>
  );
}

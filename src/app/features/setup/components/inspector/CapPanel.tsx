'use client';

import { Button } from '@/components/controls/Button';
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { CAP_NOTE, CAP_SHORT, CAP_USES } from '../../data/capabilities';
import { useSetup } from '../../hooks/SetupContext';
import { capSt } from '../../model/flow/state';
import { CapGlyph } from '../shared/CapGlyph';
import { Chip } from '../shared/Chip';
import { Spinner } from '../shared/Spinner';
import styles from './inspector.module.css';
import { TrackDep } from './parts/TrackDep';
import type { useOpenSections } from './parts/useOpenSections';

/** A picked GitLab capability: its belay doctor status, a Re-probe, and the tracks that rely on it (illustrative). */
export function CapPanel({ name, section }: { name: string; section: ReturnType<typeof useOpenSections> }) {
  const { state, actions } = useSetup();
  const st = capSt(state, name);
  const uses = CAP_USES[name] ?? [];
  const note = CAP_NOTE[name];
  return (
    <>
      <InspectorHeader title={CAP_SHORT[name] ?? name} icon={<CapGlyph st={st} size={18} />} sub={name}>
        <div className={styles.chips}>
          <Chip tone={st === 'available' ? 'ok' : st === 'unknown' ? 'unknown' : 'fail'}>{st}</Chip>
          <Chip>belay doctor · {state.group}</Chip>
        </div>
        {note ? <p className={styles.does}>{note}</p> : null}
      </InspectorHeader>
      <InspectorSection title="Probe" aux={state.doctorNever ? 'never' : state.doctorProbedAt} {...section('probe')}>
        <Button disabled={state.doctorBusy} onClick={() => void actions.reprobe()}>
          {state.doctorBusy ? (
            <>
              <Spinner /> probing
            </>
          ) : (
            'Re-probe the group'
          )}
        </Button>
      </InspectorSection>
      <InspectorSection title="Tracks that rely on it" aux={uses.length ? `${uses.length} · illustrative` : undefined} {...section('uses')}>
        {uses.length ? uses.map((id) => <TrackDep key={id} id={id} />) : <div className={styles.muted}>None</div>}
      </InspectorSection>
    </>
  );
}

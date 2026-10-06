'use client';

import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import { GATE_FREES } from '../../data/armMeta';
import { STEP_DETAIL } from '../../data/stepDetail';
import { useSetup } from '../../hooks/SetupContext';
import { armList, doneCount, humanGates, needYouCount, openArms, stepList } from '../../model/flow/state';
import { DepRow } from '../shared/DepRow';
import { GateRow } from '../shared/GateRow';
import styles from './inspector.module.css';
import { CapDep } from './parts/CapDep';
import { Stats } from './parts/Stats';
import type { useOpenSections } from './parts/useOpenSections';

/** Nothing picked: the counts, the gates only you can open (and what each frees), the tracks ready, the unknowns. */
export function DefaultPanel({ section }: { section: ReturnType<typeof useOpenSections> }) {
  const { state, tracks, view } = useSetup();
  const arms = armList(state);
  const ready = arms.filter((a) => a.st === 'ready');
  const gates = humanGates(state);
  const open = openArms(state);
  const need = needYouCount(state);
  const unknown = state.doctor.filter((r) => r.st === 'unknown');
  return (
    <>
      <InspectorHeader title={`${state.group} / ${state.project}`} sub={`${doneCount(state)} of ${stepList(state).length} steps probed`} />
      <InspectorSection title="Where you stand" {...section('stand')}>
        <Stats
          cells={[
            { n: arms.filter((a) => a.st === 'armed').length, label: 'armed', tone: 'ok' },
            { n: ready.length, label: 'ready', tone: 'accent' },
            { n: arms.filter((a) => a.st === 'locked').length, label: 'locked', tone: 'plain' },
            { n: need, label: 'need you', tone: 'you' },
          ]}
        />
      </InspectorSection>
      <InspectorSection title="Only you can do these" aux={<NeedsYouBadge count={need} small />} {...section('gates')}>
        {open.map((a) => (
          <GateRow key={a.id} glyph="!" title={`Merge ${a.mr}${a.revert ? ' (revert)' : ''}`} tag={a.id} sub="then verify" onGo={() => view.go({ k: 'track', id: a.id })} />
        ))}
        {gates.map((s) => (
          <GateRow
            key={s.n}
            glyph={s.n}
            title={STEP_DETAIL[s.n]?.short ?? s.title}
            tag={`step ${s.n}`}
            sub={`frees ${GATE_FREES[s.n] ?? 'later steps'}`}
            onGo={() => view.go({ k: 'step', id: s.n })}
          />
        ))}
        {need ? null : <div className={styles.muted}>Nothing waits for you</div>}
      </InspectorSection>
      <InspectorSection title="Ready to arm" aux={ready.length ? `${ready.length} · one MR each` : undefined} {...section('ready')}>
        {ready.map((a) => (
          <DepRow key={a.id} tone="ready" glyph="▸" label={`${a.id} ${tracks[a.id]?.name ?? ''}`} state="preview" onGo={() => view.go({ k: 'track', id: a.id })} />
        ))}
        {ready.length ? null : <div className={styles.muted}>No track is ready</div>}
      </InspectorSection>
      {unknown.length ? (
        <InspectorSection title="Unknown" aux={`${unknown.length} · never rounded up`} {...section('unk')}>
          {unknown.map((r) => (
            <CapDep key={r.name} name={r.name} />
          ))}
        </InspectorSection>
      ) : null}
    </>
  );
}

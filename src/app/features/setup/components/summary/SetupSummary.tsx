'use client';

import { Unread } from '@/components/shell/host';
import { pluralWord } from '@/lib/format/plural';
import { GATE_FREES } from '../../data/armMeta';
import { useSetup } from '../../hooks/SetupContext';
import { armList, doneCount, humanGates, isUnread, needYouCount, openArms, stepDetail, stepList } from '../../model/flow/state';
import { mergeLabel } from '../../model/flow/wording';
import { UnreadStats } from '../pending/UnreadStats';
import { GateRow } from '../shared/GateRow';
import styles from './SetupSummary.module.css';

/**
 * Where you stand, above the map: the counts, and the gates only you can open (each says what it frees). It replaces
 * the inspector's default panel; the doctor's read stays in the toolbar lozenge and the node tooltips. The strip carries
 * the map's dot grid, so the glass panel inset in it blurs the same ground the map draws; each gate is its own tile.
 */
export function SetupSummary() {
  const { state, view } = useSetup();
  const arms = armList(state);
  const gates = humanGates(state);
  const open = openArms(state);
  const need = needYouCount(state);
  // Live, before a read lands: its counts are dashes, and no gate is counted or listed from steps nobody has read.
  const noSteps = isUnread(state, 'steps');
  const noArms = noSteps || isUnread(state, 'tracks');
  const noDoctor = isUnread(state, 'doctor');
  const unknown = noDoctor ? [] : state.doctor.filter((r) => r.st === 'unknown');
  const arm = (st: string) => (noArms ? null : arms.filter((a) => a.st === st).length);
  return (
    <section className={styles.strip} aria-label="Where you stand">
      <div className={styles.panel}>
        <div className={styles.top}>
          <UnreadStats
            cells={[
              { n: arm('armed'), label: 'armed', tone: 'ok' },
              { n: arm('ready'), label: 'ready', tone: 'accent' },
              { n: arm('locked'), label: 'locked', tone: 'plain' },
              { n: noSteps ? null : need, label: 'need you', tone: 'you' },
            ]}
          />
          <span className={styles.note} title={unknown.length ? unknown.map((r) => r.name).join(' · ') : undefined}>
            {noSteps ? (
              <>
                {`${state.group} / ${state.project} · `}
                <Unread label="steps not read yet" />
                {` of ${stepList(state).length} steps read done`}
              </>
            ) : (
              `${state.group} / ${state.project} · ${doneCount(state)} of ${stepList(state).length} steps read done`
            )}
            {unknown.length ? ` · ${unknown.length} ${pluralWord(unknown.length, 'capability', 'capabilities')} unknown, never rounded up` : ''}
          </span>
          {state.doctorError ? <span className={styles.err}>{`belay doctor: ${state.doctorError}`}</span> : null}
        </div>
        <div className={styles.gates} aria-label="Only you can do these">
          {open.map((a) => (
            <GateRow key={a.id} glyph="!" title={`Merge ${mergeLabel(a)}`} tag={a.id} sub="then verify" onGo={() => view.go({ k: 'track', id: a.id })} />
          ))}
          {(noSteps ? [] : gates).map((s) => (
            <GateRow
              key={s.n}
              glyph={s.n}
              title={stepDetail(state, s.n)?.short ?? s.title}
              tag={`step ${s.n}`}
              sub={`${s.st === 'unknown' ? 'unread · ' : s.st === 'failed' ? 'not yet · ' : ''}frees ${GATE_FREES[s.n] ?? 'later steps'}`}
              onGo={() => view.go({ k: 'step', id: s.n })}
            />
          ))}
          {noSteps ? <span className={styles.note}>Reading the steps</span> : need ? null : <span className={styles.note}>Nothing waits for you</span>}
        </div>
      </div>
    </section>
  );
}

'use client';

import { Stats } from '@/components/inspector/blocks/Stats';
import { GATE_FREES } from '../../data/armMeta';
import { useSetup } from '../../hooks/SetupContext';
import { armList, doneCount, humanGates, needYouCount, openArms, stepDetail, stepList } from '../../model/flow/state';
import { mrName } from '../../model/flow/wording';
import { GateRow } from '../shared/GateRow';
import styles from './SetupSummary.module.css';

/**
 * Where you stand, above the map: the counts, and the gates only you can open (each says what it frees). It replaces
 * the inspector's default panel; the doctor's read stays in the toolbar lozenge and the node tooltips.
 */
export function SetupSummary() {
  const { state, view } = useSetup();
  const arms = armList(state);
  const gates = humanGates(state);
  const open = openArms(state);
  const need = needYouCount(state);
  const unknown = state.doctor.filter((r) => r.st === 'unknown');
  return (
    <section className={styles.strip} aria-label="Where you stand">
      <div className={styles.top}>
        <Stats
          cells={[
            { n: arms.filter((a) => a.st === 'armed').length, label: 'armed', tone: 'ok' },
            { n: arms.filter((a) => a.st === 'ready').length, label: 'ready', tone: 'accent' },
            { n: arms.filter((a) => a.st === 'locked').length, label: 'locked', tone: 'plain' },
            { n: need, label: 'need you', tone: 'you' },
          ]}
        />
        <span className={styles.note} title={unknown.length ? unknown.map((r) => r.name).join(' · ') : undefined}>
          {`${state.group} / ${state.project} · ${doneCount(state)} of ${stepList(state).length} steps probed`}
          {unknown.length ? ` · ${unknown.length} capabilities unknown, never rounded up` : ''}
        </span>
        {state.doctorError ? <span className={styles.err}>{`belay doctor: ${state.doctorError}`}</span> : null}
      </div>
      <div className={styles.gates} aria-label="Only you can do these">
        {open.map((a) => (
          <GateRow key={a.id} glyph="!" title={`Merge ${mrName(a)}${a.revert ? ' (revert)' : ''}`} tag={a.id} sub="then verify" onGo={() => view.go({ k: 'track', id: a.id })} />
        ))}
        {gates.map((s) => (
          <GateRow
            key={s.n}
            glyph={s.n}
            title={stepDetail(state, s.n)?.short ?? s.title}
            tag={`step ${s.n}`}
            sub={`${s.st === 'unknown' ? 'unread · ' : s.st === 'failed' ? 'not yet · ' : ''}frees ${GATE_FREES[s.n] ?? 'later steps'}`}
            onGo={() => view.go({ k: 'step', id: s.n })}
          />
        ))}
      </div>
    </section>
  );
}

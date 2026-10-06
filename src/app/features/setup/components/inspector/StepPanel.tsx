'use client';

import { Button } from '@/components/controls/Button';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import { plural } from '@/lib/format/plural';
import { GATE_FREES } from '../../data/armMeta';
import { STEP_DETAIL } from '../../data/stepDetail';
import { useSetup } from '../../hooks/SetupContext';
import { GRAPH } from '../../model/map/appGraph';
import { stepFreesAll } from '../../model/map/graph';
import { Chip } from '@/components/status/chip/Chip';
import styles from './inspector.module.css';
import { ProbeLine } from './parts/ProbeLine';
import { TrackDep } from './parts/TrackDep';
import type { useOpenSections } from './parts/useOpenSections';

/** A picked step: who does it, the exact command or the thing to do, the last probe, and what it frees. */
export function StepPanel({ n, section }: { n: number; section: ReturnType<typeof useOpenSections> }) {
  const { state, actions } = useSetup();
  const s = state.steps[n];
  const d = STEP_DETAIL[n];
  if (!s || !d) return null;
  const done = s.st === 'done';
  const busy = s.st === 'probing';
  const gate = d.who === 'human' && !done;
  const { direct, more } = stepFreesAll(GRAPH, n);
  const freed = direct.length + more.length;
  const rows: [string, string][] = [['Do', d.action ?? ''], ['Where', d.where ?? '']];
  if (d.note) rows.push(['Note', d.note]);
  return (
    <>
      <InspectorHeader
        title={s.title}
        icon={<span className={`${styles.mk} ${done ? styles.mkOk : gate ? styles.mkYou : ''}`}>{done ? '✓' : n}</span>}
        sub={`Step ${n} · ${s.phase}`}
      >
        <div className={styles.chips}>
          {done ? <Chip tone="ok">probed</Chip> : gate ? <Chip tone="you">only you</Chip> : <Chip tone="accent">agent or you</Chip>}
          {d.write ? <Chip>writes</Chip> : null}
        </div>
        <p className={styles.does}>{d.does}</p>
      </InspectorHeader>
      {done ? null : d.who === 'human' ? (
        <InspectorSection title="Do this" {...section('do')}>
          <KeyValue rows={rows} />
          {d.secret ? (
            <>
              <div className={styles.cmdh}>
                you type the value<span>Belay never sees it</span>
              </div>
              <CommandBlock commands={d.cmd ?? []} />
            </>
          ) : null}
          <div className={styles.acts}>
            {d.secret ? <Button onClick={() => actions.copyStep(n)}>Copy command</Button> : <Button onClick={() => actions.openWhere(n)}>Open in GitLab ↗</Button>}
            <Button variant="primary" disabled={busy} onClick={() => void actions.probe(n)}>
              I did it · verify
            </Button>
          </div>
        </InspectorSection>
      ) : (
        <InspectorSection title="Next write" aux="preview · nothing sent" {...section('write')}>
          <CommandBlock commands={[...(d.cmd ?? []), { note: '# runs as @you via glab · flags illustrative' }]} />
          <div className={styles.acts}>
            <Button variant="accent" disabled={busy} title="Or your coding agent runs it via adopt-belay. Done only on the probe." onClick={() => void actions.send(n)}>
              Send as you
            </Button>
            <Button onClick={() => actions.copyStep(n)}>Copy</Button>
            <Button onClick={() => actions.skip(n)}>Skip</Button>
          </div>
        </InspectorSection>
      )}
      <InspectorSection title="Last probe" aux={s.probe && !busy ? s.probe.at : undefined} {...section('probe')}>
        <ProbeLine probe={s.probe} busy={busy} what="GitLab" />
      </InspectorSection>
      <InspectorSection title="Frees" aux={freed ? plural(freed, 'track') : undefined} {...section('frees')}>
        {freed ? (
          [...direct, ...more].map((id) => <TrackDep key={id} id={id} />)
        ) : (
          <div className={styles.muted}>{GATE_FREES[n] ? `No track directly · ${GATE_FREES[n]}` : 'No track directly · later steps rely on it'}</div>
        )}
      </InspectorSection>
    </>
  );
}

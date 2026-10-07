'use client';

import { Button } from '@/components/controls/Button';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import { plural } from '@/lib/format/plural';
import { GATE_FREES } from '../../data/armMeta';
import { useSetup } from '../../hooks/SetupContext';
import { stepDetail } from '../../model/flow/state';
import { GRAPH } from '../../model/map/appGraph';
import { stepFreesAll } from '../../model/map/graph';
import { Chip } from '@/components/status/chip/Chip';
import styles from './inspector.module.css';
import { ProbeLine } from './parts/ProbeLine';
import { TrackDep } from './parts/TrackDep';
import type { useOpenSections } from './parts/useOpenSections';

function StateChip({ st, gate }: { st: string; gate: boolean }) {
  if (st === 'done') return <Chip tone="ok">probed</Chip>;
  if (st === 'unknown') return <Chip tone="unknown">unknown</Chip>;
  if (st === 'failed') return <Chip tone="bad">probed · not yet</Chip>;
  return gate ? <Chip tone="you">only you</Chip> : <Chip tone="accent">agent or you</Chip>;
}

/**
 * A picked step: who does it, the exact command or the thing to do, the last probe, and what it frees. Live mode never
 * sends a step's write from here (Copy only), and its commands name the paired group and project.
 */
export function StepPanel({ n, section }: { n: number; section: ReturnType<typeof useOpenSections> }) {
  const { state, actions, illustrative } = useSetup();
  const s = state.steps[n];
  const d = stepDetail(state, n);
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
          <StateChip st={s.st} gate={gate} />
          {d.write ? <Chip>writes</Chip> : null}
          {illustrative.steps ? <Chip title="The step's title and phase are the demo catalogue's; its state is what the read saw">title · demo</Chip> : null}
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
        <InspectorSection title="Next write" aux={state.live ? 'copy · Belay does not send it' : 'preview · nothing sent'} {...section('write')}>
          <CommandBlock commands={[...(d.cmd ?? []), { note: state.live ? '# run it as you, or your agent via adopt-belay · flags illustrative' : '# runs as @you via glab · flags illustrative' }]} />
          <div className={styles.acts}>
            {state.live ? null : (
              <Button variant="accent" disabled={busy} title="Or your coding agent runs it via adopt-belay. Done only on the probe." onClick={() => void actions.send(n)}>
                Send as you
              </Button>
            )}
            <Button onClick={() => actions.copyStep(n)}>Copy</Button>
            {state.live ? (
              <Button disabled={busy} onClick={() => void actions.probe(n)}>
                Read again
              </Button>
            ) : (
              <Button onClick={() => actions.skip(n)}>Skip</Button>
            )}
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

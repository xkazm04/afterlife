'use client';

import { Button } from '@/components/controls/Button';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import { plural } from '@/lib/format/plural';
import { GATE_FREES } from '../../data/armMeta';
import { useSetup } from '../../hooks/SetupContext';
import { isSaid, stepDetail } from '../../model/flow/state';
import { saidText } from '../../model/flow/wording';
import { GRAPH } from '../../model/map/appGraph';
import { stepFreesAll } from '../../model/map/graph';
import { Chip } from '@/components/status/chip/Chip';
import styles from './inspector.module.css';
import { ProbeLine } from './parts/ProbeLine';
import { TrackDep } from './parts/TrackDep';
import type { useOpenSections } from './parts/useOpenSections';

function StateChip({ st, gate, said }: { st: string; gate: boolean; said: string | null }) {
  if (said) return <Chip tone="unknown" title="Not a read: Belay cannot see this step done">{saidText(said)}</Chip>;
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
  const said = isSaid(s) ? (s.said ?? null) : null;
  const gate = d.who === 'human' && !done && !said;
  const canSay = state.live && !!d.unread && s.st === 'unknown';
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
          <StateChip st={s.st} gate={gate} said={said} />
          {d.write ? <Chip>writes</Chip> : null}
          {illustrative.steps ? <Chip title="The step's title and phase are the demo catalogue's; its state is what the read saw">title · demo</Chip> : null}
        </div>
        <p className={styles.does}>{d.does}</p>
      </InspectorHeader>
      {done ? null : d.who === 'human' ? (
        <InspectorSection title="Do this" {...section('do')}>
          <KeyValue rows={rows} />
          {d.unread ? <div className={styles.muted}>Not readable: {d.unread}</div> : null}
          {d.secret ? (
            <>
              <div className={styles.cmdh}>
                you type the value<span>Belay never sees it</span>
              </div>
              <CommandBlock commands={d.cmd ?? []} />
            </>
          ) : null}
          <div className={styles.acts}>
            {d.secret ? (
              (d.cmd ?? []).map((c, i) => (
                <Button key={c} title="One command per paste: each waits for its own value" onClick={() => actions.copyStep(n, i)}>
                  {(d.cmd ?? []).length > 1 ? `Copy ${i + 1}` : 'Copy command'}
                </Button>
              ))
            ) : (
              <Button onClick={() => actions.openWhere(n)}>Open in GitLab ↗</Button>
            )}
            <Button variant="primary" disabled={busy} onClick={() => void actions.probe(n)}>
              I did it · verify
            </Button>
            {canSay ? (
              <Button disabled={busy} title="Belay writes nothing and still reads this step unknown; it stops counting it as yours" onClick={() => (said ? actions.unsay(n) : actions.sayDone(n))}>
                {said ? 'Take it back' : 'I did it · say so'}
              </Button>
            ) : null}
          </div>
        </InspectorSection>
      ) : (
        <InspectorSection title="Next write" aux={state.live ? 'copy · Belay does not send it' : 'preview · nothing sent'} {...section('write')}>
          <CommandBlock commands={[...(d.cmd ?? []), { note: state.live ? '# run it as you, or your agent via adopt-belay' : '# runs as @you via glab' }]} />
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

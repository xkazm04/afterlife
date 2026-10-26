'use client';

import { useId } from 'react';
import { Button } from '@/components/controls/Button';
import { Reveal, Unread } from '@/components/shell/host';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { Window } from '@/components/shell/Window';
import { Chip } from '@/components/status/chip/Chip';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { NodeDetail } from './components/NodeDetail';
import { useTrace } from './components/useTrace';
import { Wire } from './components/Wire';
import { NODES } from './model/nodes';
import type { TraceFacts } from './model/types';
import styles from './components/trace.module.css';

/** The live source's reason as a sentence: it ends in a full stop. */
const sentence = (s: string): string => (/[.!?]$/.test(s) ? s : `${s}.`);

/** Which GitLab the probes read, said on the toolbar: demo data is never mistaken for a group, nor the fake for a real one. */
function sourceChip(f: TraceFacts | undefined) {
  if (!f) {
    return (
      <Chip tone="unknown">
        <Unread label="which GitLab: not read yet" />
      </Chip>
    );
  }
  if (f.fake) return <Chip tone="unknown">seeded fake GitLab, not a real group</Chip>;
  if (f.mode === 'demo') return <Chip tone="unknown">demo server · real probes of this machine&apos;s glab, read only</Chip>;
  return <Chip tone="accent">live · glab on {f.host}</Chip>;
}

/**
 * Trace: setting up your first project as one wire, from this machine (glab) through GitLab (login, group, doctor) to
 * Afterlife (live mode, the unlock map). Each node lights when the app's own probe passes; the selected one shows the
 * exact command to copy. Afterlife writes nothing here. In live mode before the first poll, or with an empty group, the
 * (app) layout shows this screen instead of the error page (`facts.gate`, LiveGate). The window, the toolbar and the
 * wire paint before the server's facts are read (`facts` absent): a dash for the subtitle, the source and the command.
 * `rehearse` (?rehearse=not-ready) comes from the URL, so the probe starts at once. `onLive`: the live node passed while
 * Trace stood in for the app.
 */
export function TraceScreen({ facts, rehearse = false, onLive }: { facts?: TraceFacts; rehearse?: boolean; onLive?: () => void }) {
  const t = useTrace(facts, rehearse, onLive);
  const panelId = useId();
  const passing = NODES.filter((n) => t.nodes[n.key].state === 'pass').length;
  const gate = facts?.gate ?? null;
  const subtitle = !facts ? '—' : facts.fake ? 'acme-lab · seeded fake GitLab' : `group ${facts.groupId} on ${facts.host}`;
  return (
    <Window
      title="Trace"
      subtitle={subtitle}
      toolbar={
        <div className={styles.tools}>
          {facts?.rehearsal ? <HonestyChip kind="simulated" meaning="the not-ready state, shown on purpose">rehearsal</HonestyChip> : null}
          {sourceChip(facts)}
          <Button variant="accent" onClick={t.recheck} aria-busy={t.checking} data-xray="recheck">
            {t.checking ? 'Probing…' : 'Re-check all'}
          </Button>
        </div>
      }
      status={`${passing} of ${NODES.length} pass${t.at ? ` · probed ${t.at}` : ''} · writes nothing · env changes need a restart`}
    >
      <PaneScroll padded>
        <div className={styles.page}>
          <Reveal order={1} slice="facts">
            {gate ? (
              <header className={styles.gate} role="status">
                <span className={styles.kicker}>{gate === 'empty' ? 'Live · the group is empty' : 'Live · first poll not finished'}</span>
                <h1 className={styles.h1}>{gate === 'empty' ? 'Afterlife is watching a group with no project' : 'Afterlife is live, and has nothing to show yet'}</h1>
                <p className={styles.lede}>
                  {sentence(facts?.reason ?? 'The first poll finished and found no project')} Every screen opens here instead of an error page until the
                  wire below reaches the group; Re-check brings the app back once it does.
                </p>
              </header>
            ) : (
              <header className={styles.intro}>
                <span className={styles.kicker}>Set up my first project</span>
                <h1 className={styles.h1}>From this machine to your GitLab group, one wire</h1>
                <p className={styles.lede}>
                  Six links, left to right. Each lights when the app&apos;s own probe passes. Afterlife runs none of these commands:
                  copy them into your terminal, then Re-check.
                </p>
              </header>
            )}
          </Reveal>
          <Reveal order={2}>
            <Wire nodes={t.nodes} selected={t.selected} onSelect={t.select} round={t.round} checking={t.checking} panelId={panelId} />
          </Reveal>
          {t.refused ? (
            <p className={styles.refused} role="alert">
              Re-check refused: {t.refused}
            </p>
          ) : null}
          <Reveal order={3} slice="facts">
            <NodeDetail
              id={panelId}
              node={t.selected}
              read={t.nodes[t.selected]}
              facts={facts}
              caps={t.caps}
              at={t.at}
              checking={t.checking}
              onRecheck={t.recheck}
            />
          </Reveal>
          <p className={styles.foot}>
            Read only: the probes send GETs as your own glab login and change nothing in GitLab or here. Writes stay a person&apos;s
            click, on the screens that make them. Not sure what the agents do? <a href="/about">Watch the film</a>.
          </p>
        </div>
      </PaneScroll>
    </Window>
  );
}

'use client';

import { Button } from '@/components/controls/Button';
import { Spacer } from '@/components/controls/Spacer';
import { SegmentedControl } from '@/components/controls/toolbar/SegmentedControl';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { Reveal } from '@/components/shell/host';
import { Window } from '@/components/shell/Window';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { ChatDrawer } from './components/chat/ChatDrawer';
import { ConstellationVariant } from './constellation/ConstellationVariant';
import { ActionSheet } from './components/sheet/ActionSheet';
import { SourceChips } from './components/SourceChips';
import { useStart, type StartProps } from './hooks/useStart';
import type { Path, StartView } from './model/view';
import styles from './start.module.css';

const PATHS: { value: Path; label: string; title: string }[] = [
  { value: 'hand', label: 'By hand', title: 'Copy each command, or Run it after its preview' },
  { value: 'assist', label: 'With Afterlife', title: 'Ask Afterlife: it proposes the same actions for your confirm' },
];

/** The gate's heading, one line: live with nothing to show yet stands in for the app here. */
const GATE = { 'not-ready': 'Afterlife is live and waiting for its first look at the group', empty: 'Afterlife is watching a group with no project yet' } as const;

function subtitleOf(v: StartView): string {
  if (v.source.fake) return 'acme-lab · seeded fake GitLab';
  return v.source.mode === 'demo' ? 'demo server' : `group ${v.source.group} on ${v.source.host}`;
}

/**
 * Set up my first project: one wizard from this machine through GitLab to Afterlife (repo, glab, login, group, live,
 * stack, save, unlock map). Each step is derived from what the probes see now; every step can be done by hand (copy
 * the command, or Run it after the server's preview) or with "Ask Afterlife". The steps are drawn as a constellation
 * around this machine; the (app) layout's gate shows this same screen while live mode has nothing to show. The screen
 * host mounts it once the facts are read (screen/host.tsx), so the page enters on mount; "Your repos" may still be a dash.
 */
export function StartScreen(props: StartProps) {
  const view = useStart(props);
  const done = view.steps.filter((s) => s.state === 'done').length;
  return (
    <Window
      title="Set up my first project"
      subtitle={subtitleOf(view)}
      toolbar={
        <>
          <Spacer />
          {view.rehearsal ? <HonestyChip kind="simulated" meaning="the not-ready state, shown on purpose">rehearsal</HonestyChip> : null}
          <SegmentedControl label="Path" value={view.path} onChange={view.setPath} options={PATHS} />
          <Button variant="accent" onClick={view.recheck} aria-busy={view.running} data-xray="recheck">
            Re-check
          </Button>
        </>
      }
      status={`${done} of ${view.steps.length} done${view.at ? ` · checked ${view.at}` : ''}${view.running ? ` · checking ${view.elapsedS} s` : ''}`}
    >
      <PaneScroll padded>
        <Reveal order={1} className={styles.page}>
          {view.gate ? (
            <header className={styles.gate} role="status">
              <h1 className={styles.h1}>{GATE[view.gate]}</h1>
            </header>
          ) : null}
          <SourceChips source={view.source} />
          {view.refused ? (
            <p className={styles.refused} role="alert">
              Re-check refused: {view.refused}
            </p>
          ) : null}
          <ConstellationVariant view={view} />
        </Reveal>
      </PaneScroll>
      <ChatDrawer chat={view.chat} />
      {view.pending ? <ActionSheet pending={view.pending} /> : null}
    </Window>
  );
}

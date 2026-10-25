'use client';

import Link from 'next/link';
import { Spacer } from '@/components/controls/Spacer';
import { SegmentedControl } from '@/components/controls/toolbar/SegmentedControl';
import { useToast } from '@/components/overlays/toast/useToast';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { Window } from '@/components/shell/Window';
import { copyCommand } from '@/lib/clipboard/copyCommand';
import { useNow } from '@/lib/clock/useNow';
import type { ClaudeRepo } from '@/schemas/vitals';
import { FoundStep } from './components/FoundStep';
import { RepoStep } from './components/RepoStep';
import { SaveStep } from './components/SaveStep';
import { WizardLegend, WizardStatus } from './components/WizardChrome';
import { useWizard } from './hooks/useWizard';
import { ENGINES } from './model/format';
import styles from './wizard.module.css';

/**
 * Onboard: a real project in one click. Pick a repo you already work in with Claude Code; a low-effort model proposes
 * its host, components, pipelines and variants and cloud resource; a typed read-only probe checks each line as you
 * watch; Save keeps only the lines a probe confirmed. The demo estate funnel lives at /onboard/estate.
 */
export function WizardScreen({ repos, note }: { repos: readonly ClaudeRepo[]; note?: string }) {
  const w = useWizard();
  const { status } = useToast();
  // Ages read the wall clock once mounted, so the server's render and the client's first one agree.
  const now = useNow(60_000);
  const busy = w.phase === 'proposing' || w.phase === 'probing' || w.phase === 'saving';
  return (
    <Window
      title="Onboard"
      subtitle="a real project, confirmed line by line"
      toolbar={
        <>
          <SegmentedControl
            label="Engine"
            value={w.engine}
            onChange={w.setEngine}
            options={ENGINES.map((e) => ({ value: e.key, label: e.label, title: e.title }))}
          />
          <Spacer />
        </>
      }
      realData
      status={<WizardStatus repos={repos} s={w} />}
      help={<WizardLegend />}
      helpTitle="The checklist"
    >
      <PaneScroll>
        <div className={styles.page}>
          <RepoStep repos={repos} note={note} picked={w.picked} busy={busy} now={now} onPick={w.pick} />
          <FoundStep s={w} onRerun={w.rerun} onCopy={(c) => copyCommand(c, navigator.clipboard, status, `Copied ${c}`)} />
          <SaveStep s={w} onSave={w.saveIt} onRerun={w.rerun} />
          <p className={styles.pageFoot}>
            Looking for the estate funnel? <Link href="/onboard/estate">Demo estate (illustrative)</Link>
          </p>
        </div>
      </PaneScroll>
    </Window>
  );
}

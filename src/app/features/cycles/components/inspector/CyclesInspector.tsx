import { Button } from '@/components/controls/Button';
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import { Stats } from '@/components/inspector/blocks/Stats';
import { Chip } from '@/components/status/chip/Chip';
import type { CyclesData } from '../../model/build';
import { summarize } from '../../model/replay';
import type { Cycle } from '../../model/types';
import { STATE_WORD } from '../../model/words';
import { ClosingRule } from './ClosingRule';
import styles from './inspector.module.css';

const STATE_TONE = { closed: 'ok', running: 'accent', planned: 'unknown' } as const;

function numbers(c: Cycle) {
  const s = summarize(c);
  if (c.state === 'closed') {
    return [
      { n: s.credited + s.resolved, label: 'credited', tone: 'ok' as const },
      { n: s.missed, label: 'not earned' },
      { n: s.regressed, label: 'drift caught' },
      { n: s.net, label: 'net rungs', tone: 'accent' as const },
    ];
  }
  const aim = c.changes.reduce((n, ch) => n + Math.max(0, ch.to - (ch.from ?? 0)), 0);
  return [
    { n: c.changes.length, label: c.state === 'running' ? 'picked' : 'proposed', tone: c.state === 'running' ? ('you' as const) : undefined },
    { n: aim, label: 'rungs in reach', tone: 'accent' as const },
  ];
}

/** The inspector for one cycle: its numbers, when it ran, the rule that closes it, and the one thing to do next. */
export function CyclesInspector({ cycle, data }: { cycle: Cycle; data: CyclesData }) {
  const running = data.cycles.find((c) => c.state === 'running');
  const closesOn = cycle.state === 'closed' ? `day ${cycle.closedDay}` : `the day ${cycle.openedDay + data.cadence} rescan, if every MR has merged`;
  return (
    <>
      <InspectorHeader
        title={`${cycle.id} · ${cycle.theme}`}
        sub={
          <span className={styles.sub}>
            <Chip compact tone={STATE_TONE[cycle.state]}>
              {STATE_WORD[cycle.state]}
            </Chip>
            {data.project}
          </span>
        }
      />
      <Stats cells={numbers(cycle)} />
      <InspectorSection title="When">
        <KeyValue
          rows={[
            ['Opened', `day ${cycle.openedDay}${cycle.state === 'running' ? ' · today' : ''}`],
            ['Closes', closesOn],
            ['Engine', `${cycle.engine} · the whole cycle`],
            ['Cadence', `every ${data.cadence} days, or on demand`],
          ]}
        />
      </InspectorSection>
      <ClosingRule cycle={cycle} />
      <InspectorSection title="Next">
        {cycle.state === 'running' ? (
          <div className={styles.next}>
            <p>
              {cycle.changes.length} picked gap{cycle.changes.length === 1 ? '' : 's'} wait for Send as you. Afterlife shows the exact commands first and holds no merge token.
            </p>
            <Button variant="primary" href="/maturity">
              Send in Maturity
            </Button>
          </div>
        ) : cycle.state === 'planned' ? (
          <div className={styles.next}>
            <p>
              Starts when {running?.id ?? 'the running cycle'} closes: one cycle at a time, so every rung it credits is measured against a settled scan.
            </p>
            <Button href="/maturity">Pick gaps in Maturity</Button>
          </div>
        ) : (
          <div className={styles.next}>
            <p>Closed. Its credits are on the Maturity credit history; anything it did not earn is carried into a later cycle.</p>
            <Button href="/maturity">Open Maturity</Button>
          </div>
        )}
      </InspectorSection>
    </>
  );
}

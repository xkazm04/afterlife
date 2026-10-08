import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { KeyValue } from '@/components/inspector/KeyValue';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { RUNNER } from '../../../data/runner';
import { Chip } from '@/components/status/chip/Chip';
import { ActBtn, Acts } from '../Acts';
import type { InspProps } from '../props';
import { ClickSec, CommandSec, Sec } from '../Sec';

function RunnerChip({ check }: { check: 'ok' | 'none' | null }) {
  if (check === 'ok') return <Chip compact tone="ok">online · simulated</Chip>;
  return <HonestyChip kind="unknown">{check === 'none' ? '? not seen yet' : '? unknown · 2 h old'}</HonestyChip>;
}

/** n5: finish the runner setup step. Belay opens the page and checks again; it writes nothing. */
export function InspRunner(p: InspProps) {
  const { s, demo, dispatch } = p;
  const { check } = s.runner;
  return (
    <>
      <InspectorHeader title={demo.runner.title} sub={`setup step ${RUNNER.step}`} path={RUNNER.url} />
      {s.status.n5 !== 'done' ? (
        <Acts>
          <ActBtn dispatch={dispatch} action="open-runner" variant="primary">
            Open the runner page
          </ActBtn>
          <ActBtn dispatch={dispatch} action="check-runner">
            Check again
          </ActBtn>
        </Acts>
      ) : null}
      <Sec k="n5-st" title="Status" p={p}>
        <KeyValue
          rows={[
            ['Runner', <RunnerChip key="r" check={check} />],
            ['Checked', check ? 'just now · simulated' : `${RUNNER.openedAt} · 2 h old`],
            ['Billing', 'Belay cannot see it'],
          ]}
        />
      </Sec>
      <ClickSec k="n5-click" p={p} does={RUNNER.does} doesNot={RUNNER.doesNot} />
      <CommandSec k="n5-cmd" p={p} commands={RUNNER.command} title="Check · read only" />
    </>
  );
}

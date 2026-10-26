import { KeyValue } from '@/components/inspector/KeyValue';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { RUNNER } from '../../../data/runner';
import { Chip } from '@/components/status/chip/Chip';
import { ActBtn, Acts } from '../Acts';
import { ItemHead } from '../Head';
import type { InspProps } from '../props';
import { ClickSec, CommandSec, Sec } from '../Sec';

function RunnerChip({ check }: { check: 'ok' | 'none' | null }) {
  if (check === 'ok') return <Chip compact tone="ok">online · simulated</Chip>;
  return <HonestyChip kind="unknown">{check === 'none' ? '? not seen yet' : `? unknown · ${RUNNER.checkedAgo}`}</HonestyChip>;
}

/** n5: finish the runner setup step. Afterlife opens the page and checks again; it writes nothing. */
export function InspRunner(p: InspProps) {
  const { s, dispatch } = p;
  const { check } = s.runner;
  return (
    <>
      <ItemHead sub={`setup step ${RUNNER.step}`} path={RUNNER.url} />
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
            ['Checked', check ? 'just now · simulated' : `${RUNNER.openedAt} · ${RUNNER.checkedAgo}`],
            ['Billing', 'Afterlife cannot see it'],
          ]}
        />
      </Sec>
      <ClickSec k="n5-click" p={p} does={RUNNER.does} doesNot={RUNNER.doesNot} />
      <CommandSec k="n5-cmd" p={p} commands={RUNNER.command} title="Check · read only" />
    </>
  );
}

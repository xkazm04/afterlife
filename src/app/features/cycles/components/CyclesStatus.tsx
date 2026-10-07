import type { CyclesData } from '../model/build';
import type { Cycle } from '../model/types';

/** The status bar: "6 cycles closed · C7 running · scan 14:02 · engine v1 · C7 selected". */
export function CyclesStatus({ data, selected }: { data: CyclesData; selected: Cycle }) {
  const closed = data.cycles.filter((c) => c.state === 'closed').length;
  const running = data.cycles.find((c) => c.state === 'running');
  return (
    <>
      {closed} cycles closed · {running ? `${running.id} running` : 'none running'} · scan {data.scannedAt} · engine {data.engine} · {selected.id} selected
    </>
  );
}

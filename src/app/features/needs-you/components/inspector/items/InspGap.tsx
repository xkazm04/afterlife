import { CommandBlock } from '@/components/inspector/CommandBlock';
import { DiffBlock } from '@/components/inspector/blocks/DiffBlock';
import { parseDiff } from '@/components/inspector/blocks/diff';
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { KeyValue } from '@/components/inspector/KeyValue';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { TierMark } from '@/components/status/TierMark';
import { GAP_DETAIL } from '../../../data/gaps';
import { commandsFor } from '../../../model/outbox/commands';
import { gapBlock } from '../../../write/desk';
import { PROPOSAL_EXTRAS } from '@/app/features/maturity/data/proposals';
import { ActBtn, Acts } from '../Acts';
import type { InspProps } from '../props';
import { ClickSec, Sec } from '../Sec';
import styles from './items.module.css';

/** One gap: a thing to explore, not a directive. Pick it, or stage its one draft MR (a probe opens an issue). */
export function InspGap({ id, ...p }: InspProps & { id: string }) {
  const { s, demo, dispatch } = p;
  const g = demo.gaps.find((x) => x.id === id);
  if (!g) return null;
  const gs = s.gapStatus[id];
  const block = gapBlock(id, demo);
  const view = s.writes[id];
  const cmds = commandsFor(id, demo, s.writes);
  const fromName = demo.rungNames[g.from] ?? '';
  const toName = demo.rungNames[g.to] ?? '';
  return (
    <>
      <InspectorHeader
        title={g.title}
        sub={
          <span className={styles.subrow}>
            <span>{g.stage}</span>
            <span>
              R{g.from} {fromName}
            </span>
            <span>→</span>
            <span>
              R{g.to} {toName}
            </span>
          </span>
        }
        path={PROPOSAL_EXTRAS[id]?.branch ?? 'no branch · nothing is sent'}
      />
      {!gs ? (
        <Acts>
          <ActBtn dispatch={dispatch} action={`tick:${id}`}>
            {s.gaps[id] ? 'Picked ✓ · untick' : 'Pick this gap'}
          </ActBtn>
          {block ? null : (
            <ActBtn dispatch={dispatch} action={`stage-gap:${id}`} variant="accent">
              Stage this gap
            </ActBtn>
          )}
        </Acts>
      ) : null}
      {gs === 'staged' ? (
        <Acts>
          <ActBtn dispatch={dispatch} action={`unstage:${id}`} variant="ghost">
            Take it back
          </ActBtn>
          <ActBtn dispatch={dispatch} action="out-on" variant="ghost">
            Show in outbox
          </ActBtn>
        </Acts>
      ) : null}
      <Sec k="gap-why" title="Gap to explore" aux="not a directive" p={p}>
        <p className={styles.voice}>{GAP_DETAIL.voice[id]}</p>
      </Sec>
      <Sec k="gap-w" title="Writes" p={p}>
        <KeyValue
          rows={[
            ['As', block ? 'nothing yet (no door for it)' : 'one draft MR'],
            ['Diff', g.diffLines ? `${g.diffLines} lines` : <HonestyChip key="d" kind="unknown">unknown until the probe runs</HonestyChip>],
            [
              'Class',
              <span key="c">
                ci-config.change <TierMark tier="assisted" />
              </span>,
            ],
          ]}
        />
      </Sec>
      <ClickSec k="gap-click" p={p} does={GAP_DETAIL.does} doesNot={GAP_DETAIL.doesNot} />
      <Sec k="gap-cmd" title="Command" p={p}>
        {block ? (
          <p className={styles.voice}>Not sent: {block}</p>
        ) : cmds && view?.kind === 'preview' ? (
          <>
            <CommandBlock commands={cmds} />
            <DiffBlock file={`gap ${id}`} lines={parseDiff(view.preview.diff)} />
          </>
        ) : (
          <p className={styles.voice}>{view?.kind === 'refused' ? `Belay refuses this write: ${view.reason}. Nothing can run.` : 'Asking Belay for the exact write…'}</p>
        )}
      </Sec>
    </>
  );
}

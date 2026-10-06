import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { UntrustedText } from '@/components/inspector/UntrustedText';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { WHO } from '../../data/constants';
import type { Snapshot } from '../../model/derive/snapshots';
import type { TheaterDemo } from '../../model/types';
import { BeatSection } from './BeatSection';
import { ChecksSection } from './ChecksSection';
import styles from './Inspector.module.css';
import { LedgerSection } from './LedgerSection';
import { NeedsSection } from './NeedsSection';

/** Layer 2: the current beat. Who and when, the entry, the untrusted quote, the hold, the checks, needs, the ledger. */
export function BeatInspector({ snap, demo, onSeek }: { snap: Snapshot; demo: TheaterDemo; onSeek: (i: number) => void }) {
  const e = snap.e;
  return (
    <>
      <InspectorHeader title={<>{WHO[e.by]}{e.seeded ? <HonestyChip kind="seeded" /> : null}</>} sub={`seq ${e.seq} · ${e.t}`}>
        <div className={styles.x}>{e.x}</div>
        {e.quote ? (
          <>
            <div className={styles.qh}>Quoted from !44 · untrusted</div>
            <div className={styles.quote}>
              <UntrustedText source="upstream changelog quoted on !44">{demo.quote}</UntrustedText>
            </div>
          </>
        ) : null}
      </InspectorHeader>
      <BeatSection beat={snap.beat} demo={demo} />
      <ChecksSection done={snap.checks} />
      <NeedsSection needs={snap.needs} />
      <LedgerSection i={snap.i} onSeek={onSeek} />
    </>
  );
}

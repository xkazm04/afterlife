import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { UntrustedText } from '@/components/inspector/UntrustedText';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import type { Snapshot } from '../../model/derive/snapshots';
import { whoOf } from '../../model/film/who';
import { seqRange } from '../../model/replay/state';
import type { Film, TheaterDemo } from '../../model/types';
import { BeatSection } from './BeatSection';
import { ChecksSection } from './ChecksSection';
import { EventSection } from './EventSection';
import styles from './Inspector.module.css';
import { LedgerSection } from './LedgerSection';
import { NeedsSection } from './NeedsSection';

/**
 * Layer 2: the current beat. Who and when, the entry, the untrusted quote, the hold, the checks, needs, the ledger.
 * A real film (`demo` null) shows its event's facts instead of the illustrative checks and needs.
 */
export function BeatInspector({ snap, film, demo, onSeek }: { snap: Snapshot; film: Film; demo: TheaterDemo | null; onSeek: (i: number) => void }) {
  const e = snap.e;
  return (
    <>
      <InspectorHeader title={<>{whoOf(e.by)}{e.seeded ? <HonestyChip kind="seeded" /> : null}</>} sub={`seq ${e.seq} · ${e.ev?.at ?? e.t}`}>
        <div className={styles.x}>{e.x}</div>
        {e.quote && demo?.quote ? (
          <>
            <div className={styles.qh}>Quoted from !44 · untrusted</div>
            <div className={styles.quote}>
              <UntrustedText source="upstream changelog quoted on !44">{demo.quote}</UntrustedText>
            </div>
          </>
        ) : null}
      </InspectorHeader>
      {e.ev ? <EventSection seq={e.seq} ev={e.ev} /> : null}
      <BeatSection beat={snap.beat} holds={film.holds} />
      {demo ? <ChecksSection done={snap.checks} /> : null}
      {demo ? <NeedsSection needs={snap.needs} /> : null}
      <LedgerSection i={snap.i} entries={film.entries} range={seqRange(film)} onSeek={onSeek} />
    </>
  );
}

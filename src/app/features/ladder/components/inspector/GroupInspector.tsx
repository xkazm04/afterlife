import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { TierMark } from '@/components/status/TierMark';
import { cellOf, holdersOf, shownName } from '../../model/rules/tiers';
import { isMechanical } from '@/lib/promotion';
import { DemoChip } from '../chrome/DemoChip';
import type { ClassRow, LedgerEntry, Track } from '../../model/types';
import { entriesForTrack } from '../../model/view/moves';
import { WhoActed } from './log/WhoActed';
import { Sec, type SectionState } from './Sec';
import styles from './inspector.module.css';

/** Layer 2 of a track (a group row): its classes with their tiers, and every move of its classes. */
export function GroupInspector({
  track,
  classes,
  ledger,
  proofDemo,
  sections,
}: {
  track: Track;
  classes: readonly ClassRow[];
  ledger: readonly LedgerEntry[];
  /** Live: the track (and its proof class) is the demo catalogue's. */
  proofDemo: boolean;
  sections: SectionState;
}) {
  const mine = classes.filter((c) => c.track === track.id);
  const moves = entriesForTrack(ledger, classes, track.id);
  return (
    <>
      <InspectorHeader
        title={
          <>
            <span className={styles.gid}>{track.id}</span>
            {track.name}
          </>
        }
        sub={
          <>
            {`${track.key} · proof ${track.proof.cls}${isMechanical(track.proof.cls) ? ' · mechanical' : ''}`} <DemoChip on={proofDemo} what="The track and its proof class" />
          </>
        }
      />
      <Sec id="g-cls" title="Classes" aux={mine.length} sections={sections}>
        {mine.map((c) => (
          <div key={c.id} className={styles.cl}>
            <span className={styles.clId}>{c.id}</span>
            <span className={styles.clRec}>{c.record ? `${c.record.accepted ?? '—'}${c.record.needed ? `/${c.record.needed}` : ''}` : c.tier === 'human_only' ? '' : 'No record yet'}</span>
            <TierMark tier={cellOf(c)} holders={holdersOf(c)} />
            <span className={styles.clTier}>{shownName(c)}</span>
          </div>
        ))}
      </Sec>
      <Sec id="g-who" title="Who acted" aux={moves.length || ''} sections={sections}>
        <WhoActed entries={moves} empty="No moves in the ledger window" />
      </Sec>
    </>
  );
}

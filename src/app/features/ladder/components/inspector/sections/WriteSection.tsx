import { DiffBlock } from '@/components/inspector/blocks/DiffBlock';
import { parseDiff } from '@/components/inspector/blocks/diff';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { TIER_META } from '@/lib/tiers';
import { commandLines } from '@/server/actions/words';
import type { ClassRow, Tier } from '../../../model/types';
import type { WriteView } from '../../../write/revoke';
import { Sec, type SectionState } from '../Sec';
import styles from './sections.module.css';

/**
 * The exact write behind `r`, as the server planned it from belay-policy (previewAction): its commands, then the
 * tier-state.yml diff. Shown before anything runs; the key or the click sends this preview and no other.
 */
export function WriteSection({ cls, to, viewOf, sections }: { cls: ClassRow; to: Tier | null; viewOf: (id: string, to: Tier) => WriteView | undefined; sections: SectionState }) {
  const view = to ? viewOf(cls.id, to) : undefined;
  return (
    <Sec id="write" title="The write behind r" aux={to ? `→ ${TIER_META[to].name}` : ''} anchor="ladder-write" sections={sections}>
      {!to ? <div className={styles.note}>Nothing to revoke</div> : null}
      {to && !view ? <div className={styles.note}>Asking Belay for the exact write…</div> : null}
      {view?.kind === 'refused' ? <div className={styles.note}>Belay refuses this write: {view.reason}</div> : null}
      {view?.kind === 'preview' ? (
        <div className={styles.write}>
          <div className={styles.note}>{view.preview.mode === 'demo' ? 'Demo: r simulates this write; nothing is sent to GitLab.' : view.preview.summary}</div>
          <CommandBlock commands={commandLines(view.preview)} label="The commands r runs" />
          <DiffBlock file="# tier-state.yml" lines={parseDiff(view.preview.diff)} label="tier-state.yml diff" />
        </div>
      ) : null}
    </Sec>
  );
}

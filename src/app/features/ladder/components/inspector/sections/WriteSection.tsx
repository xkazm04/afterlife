import { Button } from '@/components/controls/Button';
import { DiffBlock } from '@/components/inspector/blocks/DiffBlock';
import { parseDiff } from '@/components/inspector/blocks/diff';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { TIER_META } from '@/lib/tiers';
import { commandLines } from '@/server/actions/words';
import { sentWords } from '../../../model/rules/promote';
import type { Tier } from '../../../model/types';
import type { PromoteView } from '../../../write/promote';
import { Sec } from '../Sec';
import styles from './sections.module.css';

/**
 * The exact write behind a key, as the server planned it from belay-policy (previewAction): its commands, then the
 * tier-state.yml diff (a promotion's lease_expires among it); for a class several agents hold, one line per holder first.
 * `head` says which write it is ("Revoke · direct commit", "Promote · policy MR a person merges"), so it is never unclear
 * which one a key confirms. Shown before anything runs; the key or the click sends this preview and no other. Once a
 * promotion was sent, the MR GitLab opened (from the server's answer), or that the demo only simulated it.
 */
export function WriteSection({ head, keyName, to, view, nothing }: { head: string; keyName: 'r' | 'p'; to: Tier | null; view: PromoteView | undefined; nothing: string }) {
  return (
    <Sec title={head} aux={to ? `${keyName} → ${TIER_META[to].name}` : ''} wide>
      {!to ? <div className={styles.note}>{nothing}</div> : null}
      {to && !view ? <div className={styles.note}>Asking Belay for the exact write…</div> : null}
      {view?.kind === 'refused' ? <div className={styles.note}>Belay refuses this write: {view.reason}</div> : null}
      {view?.kind === 'sent' ? (
        <div className={styles.foot}>
          <span className={styles.note}>{sentWords(view)}</span>
          {view.mr && view.url ? (
            <Button href={view.url} size="mini" target="_blank" rel="noreferrer" title={`Open ${view.mr} in GitLab`}>
              Open {view.mr} ↗
            </Button>
          ) : null}
        </div>
      ) : null}
      {view?.kind === 'preview' ? (
        <div className={styles.write}>
          <div className={styles.note}>{view.preview.mode === 'demo' ? `Demo: ${keyName} simulates this write; nothing is sent to GitLab.` : view.preview.summary}</div>
          {view.preview.notes?.map((n) => (
            <div key={n} className={styles.note}>
              {n}
            </div>
          ))}
          <CommandBlock commands={commandLines(view.preview)} label={`The commands ${keyName} runs`} />
          <DiffBlock file="# tier-state.yml" lines={parseDiff(view.preview.diff)} label="tier-state.yml diff" />
        </div>
      ) : null}
    </Sec>
  );
}

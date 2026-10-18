import { CommandBlock } from '@/components/inspector/CommandBlock';
import { mergeCommands } from '../model/format';
import type { RunWave } from '@/lib/runs/types';
import styles from '../RunsScreen.module.css';

/** What the person would run to take a mergeable wave. Text only: Belay merges and pushes nothing. */
export function MergePanel({ w }: { w: RunWave }) {
  if (!w.mergeable || !w.branch) return null;
  return (
    <div className={styles.merge}>
      <b>Wave {w.wave} of {w.repo} is mergeable.</b> To take it, run these yourself:
      <CommandBlock commands={mergeCommands(w.repo, w.branch)} label={`Merge ${w.branch}`} />
    </div>
  );
}

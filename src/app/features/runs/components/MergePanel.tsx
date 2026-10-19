import { CommandBlock } from '@/components/inspector/CommandBlock';
import { mergeCommands } from '@/lib/runs/desk/desk';
import type { MergeNeed } from '@/lib/runs/desk/types';
import type { RunWave } from '@/lib/runs/types';
import styles from '../RunsScreen.module.css';

/**
 * What the person would run to take a mergeable wave, in the repo's own checkout (the fleet file's path). Text only:
 * Belay merges and pushes nothing. `needs` is the desk's merge decisions; given, a mergeable wave without one is
 * already in its base (or its branch is gone). Without it, the commands name the slug.
 */
export function MergePanel({ w, needs }: { w: RunWave; needs?: readonly MergeNeed[] }) {
  if (!w.mergeable || !w.branch) return null;
  const need = needs?.find((n) => n.repo === w.repo && n.wave === w.wave);
  if (needs && !need) {
    return <div className={styles.merge}>Wave {w.wave} of {w.repo} is in its base already, or its branch is gone: nothing to merge.</div>;
  }
  return (
    <div className={styles.merge}>
      <b>Wave {w.wave} of {w.repo} is mergeable.</b> To take it, run these yourself
      {need && !need.path ? ' from the repo (it is not in .belay/fleet.yml)' : ''}
      {need && !need.checked ? ' (git could not be asked whether it is in already)' : ''}:
      <CommandBlock commands={need?.commands ?? mergeCommands(w.repo, w.branch, 'main')} label={`Merge ${w.branch}`} />
    </div>
  );
}

import { CommandBlock } from '@/components/inspector/CommandBlock';
import { Unread } from '@/components/shell/host';
import { mergeCommands } from '@/lib/runs/desk/desk';
import type { MergeNeed } from '@/lib/runs/desk/types';
import type { RunWave } from '@/lib/runs/types';
import styles from './MergePanel.module.css';

/**
 * What the person would run to take a mergeable wave, in the repo's own checkout (the fleet file's path). Text only:
 * Belay merges and pushes nothing. `needs` is the desk's merge decisions; given, a mergeable wave without one is
 * already in its base (or its branch is gone), a quiet note in the same frame. Without it, the commands name the slug.
 * `fleetError`: .belay/fleet.yml is there but invalid (in its own words), said instead of "not in fleet.yml".
 * `pending`: the desk is still being read (git, up to seconds): the card and its title, a dash where the commands go.
 */
export function MergePanel({ w, needs, fleetError, pending = false }: { w: RunWave; needs?: readonly MergeNeed[]; fleetError?: string; pending?: boolean }) {
  if (!w.mergeable || !w.branch) return null;
  if (pending) {
    return (
      <section className={styles.card} aria-label={`Wave ${w.wave} of ${w.repo} is mergeable`} aria-busy="true">
        <h2 className={styles.title}>
          Wave {w.wave} of {w.repo} is mergeable
        </h2>
        <p className={styles.lead}>Run these yourself to take it. Belay merges and pushes nothing.</p>
        <p className={styles.note}>
          Asking git whether it is in already: <Unread label="merge commands not read yet" />
        </p>
      </section>
    );
  }
  const need = needs?.find((n) => n.repo === w.repo && n.wave === w.wave);
  if (needs && !need) {
    return (
      <section className={styles.card} aria-label={`Wave ${w.wave} of ${w.repo}`}>
        <p className={styles.note}>
          Wave {w.wave} of {w.repo} is in its base already, or its branch is gone: nothing to merge.
        </p>
      </section>
    );
  }
  return (
    <section className={styles.card} aria-label={`Wave ${w.wave} of ${w.repo} is mergeable`}>
      <h2 className={styles.title}>
        Wave {w.wave} of {w.repo} is mergeable
      </h2>
      <p className={styles.lead}>Run these yourself to take it. Belay merges and pushes nothing.</p>
      {need && !need.path ? (
        <p className={styles.note}>
          {fleetError
            ? `.belay/fleet.yml is invalid (${fleetError}), so its path is not read: fix the file, or run them from the repo's checkout.`
            : 'The repo is not in .belay/fleet.yml, so run them from its checkout.'}
        </p>
      ) : null}
      {need && !need.checked ? <p className={styles.note}>Git could not be asked whether it is in already.</p> : null}
      <div className={styles.cmds}>
        <CommandBlock commands={need?.commands ?? mergeCommands(w.repo, w.branch, 'main')} label={`Merge ${w.branch}`} />
      </div>
    </section>
  );
}

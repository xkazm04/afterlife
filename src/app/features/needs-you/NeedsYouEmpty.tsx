import { plural } from '@/lib/format/plural';
import type { RunnerNeed } from '@/lib/runs/desk/types';
import { RunnerNeeds } from './components/runner/RunnerNeeds';
import styles from './NeedsYouEmpty.module.css';

/**
 * When the source holds no inbox item to show: live mode with none read from the group yet (`seeded`: how many the demo
 * seeded into the index, which are not shown), or a demo source without the desk's items. Server component. It says what
 * is missing rather than drawing an empty inbox as if nothing waited for anyone. The cycle runner's decisions (`runner`,
 * real local data) are drawn when there are any, and then the page does not say that nothing waits.
 */
export function NeedsYouEmpty({ seeded = 0, demo = false, runner = [] }: { seeded?: number; demo?: boolean; runner?: readonly RunnerNeed[] }) {
  return demo ? (
    <main className={styles.page}>
      <h1 className={styles.title}>Needs you</h1>
      <p>
        This demo source lacks the desk&apos;s items (the promotion, CRA sign-off, gap picks and re-admit), so there is nothing to
        show. No group is being read and no poller runs in demo.
      </p>
      <RunnerNeeds needs={runner} />
    </main>
  ) : (
    <main className={styles.page}>
      <h1 className={styles.title}>Needs you</h1>
      <p>
        Belay is reading your GitLab group, and it holds no inbox items yet: no promotion, CRA sign-off, gap pick, re-admit or setup
        step has been opened for this project.
      </p>
      <p className={styles.note}>
        The inbox fills as the poller finds quarantined classes and as setup and scans run.
        {runner.length ? " Nothing from the group waits yet; the cycle runner's decisions are below." : ' Nothing is waiting that Belay knows of.'}
      </p>
      <RunnerNeeds needs={runner} />
      {seeded ? (
        <p className={styles.note}>{`${plural(seeded, 'demo item')} seeded into this index, not shown: the demo's, not your group's.`}</p>
      ) : null}
    </main>
  );
}

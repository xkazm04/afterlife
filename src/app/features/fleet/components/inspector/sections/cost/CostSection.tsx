import { Button } from '@/components/controls/Button';
import { DetailSection } from '@/components/shell/detail/DetailPage';
import { plural } from '@/lib/format/plural';
import type { CostJoin } from '@/lib/runs/desk/join';
import styles from '../sections.module.css';

/** The runner repos whose spend matched no Fleet project, said so rather than dropped. */
function NotInFleet({ unmatched }: { unmatched: readonly string[] }) {
  if (!unmatched.length) return null;
  return <p className={styles.muted}>Not in Fleet: {unmatched.join(', ')} (runner repos that match no project).</p>;
}

/**
 * What the cycle runner's agents spent on this project, from its run files (src/lib/runs/desk/join.ts): dollars and
 * waves, or "not metered" when no runner repo works it. Unknown is a dash, never $0. `cost` null: the desk was not read.
 */
export function CostSection({ id, cost }: { id: string; cost: CostJoin | null | undefined }) {
  const c = cost?.byProject[id];
  let body;
  if (!cost) body = <p className={styles.muted}>Not read: the cycle runner&apos;s files were not read for this page.</p>;
  else if (!c) {
    body = (
      <div className={styles.imp}>
        <p>Not metered: no repo in .belay/fleet.yml names this project (a gitlab: path, or a slug equal to {id}).</p>
        <NotInFleet unmatched={cost.unmatched} />
      </div>
    );
  } else {
    body = (
      <>
        <div className={styles.prf}>
          <div>
            <b>{c.costUsd === null ? '-' : `$${c.costUsd.toFixed(2)}`}</b>
            <span>{c.costUsd === null ? 'spent: not reported' : 'spent'}</span>
          </div>
          <div>
            <b>{c.waves}</b>
            <span>{c.waves === 1 ? 'wave' : 'waves'}</span>
          </div>
        </div>
        <p className={styles.muted}>By {plural(c.repos.length, 'runner repo')}: {c.repos.join(', ')}</p>
      </>
    );
  }
  return (
    <DetailSection title="Agent cost" aux={!cost ? 'not read' : c ? 'all recorded runs' : 'not metered'}>
      {body}
      <Button size="mini" href="/runs">
        Open Runs
      </Button>
    </DetailSection>
  );
}

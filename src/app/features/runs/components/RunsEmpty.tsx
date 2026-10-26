import { CommandBlock } from '@/components/inspector/CommandBlock';
import styles from '../RunsScreen.module.css';

/** No run files yet: say what makes one and where it lands. */
export function RunsEmpty({ skippedLines }: { skippedLines: number }) {
  return (
    <div className={styles.empty}>
      <h2>No runs yet</h2>
      <p>
        A run is a wave of lanes the runner works on a repo, one branch per wave. Start one with the command below; its events land in{' '}
        <code>.afterlife/runs/&lt;repo&gt;/&lt;wave&gt;.jsonl</code> and show up here.
      </p>
      <CommandBlock commands={['afterlife run --repo <slug>']} label="Start a run" />
      {skippedLines > 0 ? <p>{skippedLines} line{skippedLines === 1 ? ' was' : 's were'} found in .afterlife/runs but none was a belay.run/0 event.</p> : null}
    </div>
  );
}

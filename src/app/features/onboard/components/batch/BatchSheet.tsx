import { Button } from '@/components/controls/Button';
import { Spacer } from '@/components/controls/Spacer';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { Sheet } from '@/components/overlays/Sheet';
import type { FleetProject } from '@/lib/demo/types';
import type { OnboardWrites } from '../../hooks/useOnboardWrites';
import { nextAction, type Batch, type ProjectRun } from '../../model/batch';
import { WritePreview } from './WritePreview';
import styles from './sheet.module.css';

/**
 * The batch before it runs: the exact commands for every read, and for every write the server's preview of its MR, in the
 * order they run. Afterlife writes only on the click, and only a write whose preview is on screen; each MR then waits for
 * a person to merge it. Reads are simulated; demo mode simulates the writes server side.
 */
export function BatchSheet({
  batch,
  runs,
  byId,
  org,
  scope,
  writes,
  running = false,
  onRun,
  onClose,
}: {
  batch: Batch;
  runs: Readonly<Record<string, ProjectRun>>;
  byId: ReadonlyMap<string, FleetProject>;
  org: string;
  scope: string;
  writes: Pick<OnboardWrites, 'viewOf' | 'want'>;
  running?: boolean;
  onRun: () => void;
  onClose: () => void;
}) {
  const parts = [
    { title: 'Reads', note: 'read-only: nothing is written', ids: batch.reads },
    { title: 'Writes', note: "one MR each, with your glab login, as the server previews it", ids: batch.writes },
  ];
  const empty = !batch.reads.length && !batch.writes.length;
  return (
    <Sheet
      title={`Run the next batch · ${scope}`}
      subtitle="your glab login · Afterlife holds no merge token · a person merges every MR"
      onClose={onClose}
      footer={
        <>
          <span className={styles.count}>
            {batch.reads.length} read{batch.reads.length === 1 ? '' : 's'} · {batch.writes.length} MR{batch.writes.length === 1 ? '' : 's'} · reads simulated
          </span>
          <Spacer />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={empty || running} onClick={onRun}>
            Run as you
          </Button>
        </>
      }
    >
      {empty ? <p className={styles.empty}>Nothing to run: what is left waits for a person (merges, tokens).</p> : null}
      {parts.map((part) =>
        part.ids.length ? (
          <section key={part.title} className={styles.part}>
            <h3>
              {part.title} <span>{part.note}</span>
            </h3>
            {part.ids.map((id) => {
              const p = byId.get(id);
              const run = runs[id];
              const a = p && run ? nextAction(p, run, org) : null;
              if (!p || !a) return null;
              return (
                <div key={id} className={styles.item}>
                  <div className={styles.head}>
                    <b>{p.name}</b>
                    <span>{a.label}</span>
                  </div>
                  {a.intent ? (
                    <WritePreview intent={a.intent} view={writes.viewOf(a.intent)} want={writes.want} label={`Commands for ${p.name}`} />
                  ) : (
                    <CommandBlock commands={a.cmd} prompt={false} label={`Commands for ${p.name}`} />
                  )}
                </div>
              );
            })}
          </section>
        ) : null,
      )}
    </Sheet>
  );
}

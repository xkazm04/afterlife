import { Button } from '@/components/controls/Button';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { StageTicks } from '@/components/viz/StageTicks';
import type { FleetProject } from '@/lib/demo/types';
import type { OnboardWrites } from '../../hooks/useOnboardWrites';
import { nextAction, pathOf, resolveWord, type ProjectRun } from '../../model/batch';
import { WritePreview } from '../batch/WritePreview';
import { rank, STEP_MEANS, STEP_WORD, STEPS } from '../../model/funnel';
import styles from './inspector.module.css';

/**
 * One project: where it stands on the funnel, its day-0 baseline, and its one next step with the exact commands (for a
 * write, the server's preview of it; without `writes` none is asked for and none is spelled).
 */
export function ProjectPanel({
  p,
  run,
  org,
  onResolve,
  writes,
}: {
  p: FleetProject;
  run: ProjectRun;
  org: string;
  onResolve: (id: string) => void;
  writes?: Pick<OnboardWrites, 'viewOf' | 'want'>;
}) {
  const a = nextAction(p, run, org);
  const rated = p.stages.some((s) => s != null);
  return (
    <>
      <InspectorHeader title={p.name} sub={p.what || p.group} path={pathOf(p, org)} />
      <InspectorSection title="Funnel" aux={STEP_WORD[run.step]}>
        <ol className={styles.funnel}>
          {STEPS.map((s) => (
            <li key={s} data-done={rank(run.step) >= rank(s) || undefined} title={STEP_MEANS[s]}>
              <span aria-hidden="true">{rank(run.step) >= rank(s) ? '✓' : '○'}</span>
              {STEP_WORD[s]}
            </li>
          ))}
        </ol>
      </InspectorSection>
      <InspectorSection title="Baseline" aux={rated ? 'day-0 scan' : run.step === 'discovered' ? 'not scanned' : 'simulated'}>
        {rated ? (
          <StageTicks rungs={p.stages} />
        ) : run.step === 'discovered' ? (
          <p className={styles.p}>Unknown, never zero: the day-0 scan has not run.</p>
        ) : (
          <p className={styles.p}>Scanned in this session (simulated): the demo has no ratings for it, so its stages stay unknown, never zero.</p>
        )}
      </InspectorSection>
      <InspectorSection title="Next" aux={a ? (a.who === 'you' ? 'you' : 'Afterlife') : 'nothing'}>
        {a ? (
          <div className={styles.next}>
            <p className={styles.p}>
              <b>{a.label}</b> · moves it to {STEP_WORD[a.to].toLowerCase()} once {a.writes ? 'a person merges the MR' : a.who === 'you' ? 'the probe sees it done' : 'the probe confirms it'}.
            </p>
            {a.intent ? (
              writes ? (
                <WritePreview intent={a.intent} view={writes.viewOf(a.intent)} want={writes.want} label={`Next for ${p.name}`} />
              ) : (
                <p className={styles.p}>The exact MR is the server&apos;s preview, asked for when the batch is previewed.</p>
              )
            ) : (
              <CommandBlock commands={a.cmd} prompt={false} label={`Next for ${p.name}`} />
            )}
            {resolveWord(a.kind) ? (
              <Button size="mini" onClick={() => onResolve(p.id)} title="Simulated: the probe finds it done">
                {resolveWord(a.kind)} · re-probe
              </Button>
            ) : null}
          </div>
        ) : (
          <div className={styles.next}>
            <p className={styles.p}>In improvement cycles: every round is on the record.</p>
            <Button size="mini" href="/cycles">
              Open Cycles
            </Button>
          </div>
        )}
      </InspectorSection>
    </>
  );
}

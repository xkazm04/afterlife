import { Button } from '@/components/controls/Button';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { StageTicks } from '@/components/viz/StageTicks';
import type { FleetProject } from '@/lib/demo/types';
import { nextAction, pathOf, type ProjectRun } from '../../model/batch';
import { rank, STEP_MEANS, STEP_WORD, STEPS } from '../../model/funnel';
import styles from './inspector.module.css';

/** One project: where it stands on the funnel, its day-0 baseline, and its one next step with the exact commands. */
export function ProjectPanel({ p, run, org, onResolve }: { p: FleetProject; run: ProjectRun; org: string; onResolve: (id: string) => void }) {
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
      <InspectorSection title="Baseline" aux={rated ? 'day-0 scan' : 'not scanned'}>
        {rated ? <StageTicks rungs={p.stages} /> : <p className={styles.p}>Unknown, never zero: the day-0 scan has not run.</p>}
      </InspectorSection>
      <InspectorSection title="Next" aux={a ? (a.who === 'you' ? 'you' : 'Afterlife') : 'nothing'}>
        {a ? (
          <div className={styles.next}>
            <p className={styles.p}>
              <b>{a.label}</b> · moves it to {STEP_WORD[a.to].toLowerCase()} once {a.writes ? 'a person merges the MR' : a.who === 'you' ? 'the probe sees it done' : 'the probe confirms it'}.
            </p>
            <CommandBlock commands={a.cmd} prompt={false} label={`Next for ${p.name}`} />
            {a.kind === 'merge' || a.kind === 'token' ? (
              <Button size="mini" onClick={() => onResolve(p.id)} title="Simulated: the probe finds it done">
                {a.kind === 'merge' ? 'Merged · re-probe' : 'Renewed · re-probe'}
              </Button>
            ) : null}
          </div>
        ) : (
          <p className={styles.p}>In improvement cycles. See Cycles.</p>
        )}
      </InspectorSection>
    </>
  );
}

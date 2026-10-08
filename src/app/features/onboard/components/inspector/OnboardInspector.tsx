import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { Stats } from '@/components/inspector/blocks/Stats';
import type { OnboardApi } from '../../hooks/useOnboard';
import type { OnboardData } from '../../model/build';
import { ProjectPanel } from './ProjectPanel';
import styles from './inspector.module.css';

const READS = ['the group and its projects (group API)', 'CI config, pipelines and their reports', 'MRs, notes and deployments', 'its own policy and ledger repos'];
const WRITES = ['a bootstrap MR per project: policy record, proof jobs', 'an arm MR in belay-policy to start a cycle', 'only on your click, after the exact commands'];
const YOURS = [
  'merge every MR in GitLab (Afterlife holds no merge token)',
  'mint and renew project tokens',
  'finish a setup already under way',
  'pick the gaps each cycle closes',
];

function Lines({ items, mark }: { items: readonly string[]; mark: string }) {
  return (
    <ul className={styles.lines}>
      {items.map((t) => (
        <li key={t}>
          <span aria-hidden="true">{mark}</span>
          {t}
        </li>
      ))}
    </ul>
  );
}

/** The inspector: a picked project's place and next step, or, with nothing picked, how onboarding works. */
export function OnboardInspector({ o, data }: { o: OnboardApi; data: OnboardData }) {
  const picked = o.selected ? o.byId.get(o.selected) : undefined;
  const run = o.selected ? o.runs[o.selected] : undefined;
  if (picked && run) return <ProjectPanel p={picked} run={run} org={data.org} onResolve={o.resolve} />;
  return (
    <>
      <InspectorHeader title={`${data.org} · ${data.host}`} sub={`${o.counts.discovered} projects in ${data.groups.length} groups`} />
      <Stats
        cells={[
          { n: o.counts.watching, label: 'watching', tone: 'accent' },
          { n: o.batch.yours.length, label: 'wait for you', tone: 'you' },
          { n: o.batch.reads.length + o.batch.writes.length, label: 'in the batch' },
        ]}
      />
      <InspectorSection title="Afterlife reads" aux="on its own">
        <Lines items={READS} mark="◦" />
      </InspectorSection>
      <InspectorSection title="Afterlife writes" aux="as you">
        <Lines items={WRITES} mark="◦" />
      </InspectorSection>
      <InspectorSection title="Only you" aux="never Afterlife">
        <Lines items={YOURS} mark="◦" />
      </InspectorSection>
      <InspectorSection title="The rule">
        <p className={styles.p}>Only a probe moves a project on. A batch runs every read and at most {o.size} writes; pick a group to onboard it first.</p>
      </InspectorSection>
    </>
  );
}

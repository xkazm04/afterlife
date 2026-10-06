import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { KeyValue } from '@/components/inspector/KeyValue';
import { UntrustedText } from '@/components/inspector/UntrustedText';
import { HonestyChip } from '@/components/status/HonestyChip';
import { TierMark } from '@/components/status/TierMark';
import { PROJECT_REPO } from '../../../data/constants';
import { CRA, EVIDENCE, GRADES, GRADE_NEVER } from '../../../data/cra';
import { clockText } from '../../../model/clock/clock';
import { gradeIndex, gradeState } from '../../../model/clock/grades';
import { GradeChip } from '../../shared/GradeChip';
import { ActBtn, Acts } from '../Acts';
import type { InspProps } from '../props';
import { ClickSec, CommandSec, Sec } from '../Sec';
import styles from './items.module.css';

/** n2: the CRA early warning. Clock, the T2 draft (read before sign), the six evidence links, the grade ladder. */
export function InspCra(p: InspProps) {
  const { s, dispatch } = p;
  const st = s.status.n2;
  const gi = gradeIndex(st);
  return (
    <>
      <InspectorHeader
        title={`CRA early warning · ${CRA.vuln}`}
        sub={
          <span className={styles.subrow}>
            release {CRA.release} · {CRA.issue} <HonestyChip kind="seeded" />
          </span>
        }
        path={`${PROJECT_REPO}${CRA.issue}`}
      />
      {st !== 'sent' || !s.submitted ? (
        <Acts>
          {st === 'open' ? (
            <>
              <ActBtn dispatch={dispatch} action="read-draft">
                {s.read.draft ? 'Draft read ✓' : 'Read the draft'}
              </ActBtn>
              <ActBtn dispatch={dispatch} action="stage-n2" variant="primary" disabled={!s.read.draft}>
                Ready to sign
              </ActBtn>
            </>
          ) : null}
          {st === 'staged' ? (
            <>
              <ActBtn dispatch={dispatch} action="unstage:n2" variant="ghost">
                Take it back
              </ActBtn>
              <ActBtn dispatch={dispatch} action="out-on" variant="ghost">
                Show in outbox
              </ActBtn>
            </>
          ) : null}
          {st === 'sent' ? (
            <ActBtn dispatch={dispatch} action="submitted">
              I submitted it · note the time
            </ActBtn>
          ) : null}
        </Acts>
      ) : null}
      <Sec k="n2-clock" title="Clock" aux={<span>{clockText(p.leftSec)} left</span>} p={p}>
        <KeyValue
          rows={[
            ['Aware', `${CRA.awareAt} · a person confirms`],
            ['Early warning due', CRA.dueAt],
            ...CRA.next,
            [
              'Submit',
              <span key="submit">
                <TierMark tier="human_only" /> Human only
              </span>,
            ],
          ]}
        />
      </Sec>
      <Sec k="n2-draft" title="Draft · T2" aux={s.read.draft ? 'read' : 'unread'} def={s.read.draft} p={p}>
        <div className={styles.ul}>
          <span>T2&rsquo;s words · untrusted until a person reads them</span>
        </div>
        <UntrustedText source="T2, the drafting agent">{CRA.draft}</UntrustedText>
      </Sec>
      <Sec k="n2-ev" title="Evidence" aux={`${p.demo.signoff.linksResolved} resolve`} p={p}>
        {EVIDENCE.map((e) => (
          <div key={e.what} className={styles.lk}>
            <span className={styles.y}>✓</span>
            <span className={styles.t} title={e.detail}>
              {e.what}
            </span>
            <span className={styles.s}>{e.ref}</span>
          </div>
        ))}
      </Sec>
      <Sec k="n2-grade" title="Grade" aux={GRADES[gi]?.name} def={false} p={p}>
        <div className={styles.gl3}>
          {GRADES.map((g, i) => (
            <GradeRow key={g.name} name={g.name} why={g.why} state={gradeState(i, gi)} />
          ))}
          <GradeChip state="never">{GRADE_NEVER.name}</GradeChip>
          <span>{GRADE_NEVER.why}</span>
        </div>
      </Sec>
      <ClickSec k="n2-click" p={p} does={CRA.does} doesNot={CRA.doesNot} />
      <CommandSec k="n2-cmd" p={p} commands={CRA.commands} aux={CRA.writeRef} />
    </>
  );
}

function GradeRow({ name, why, state }: { name: string; why: string; state: 'cur' | 'done' | 'idle' }) {
  return (
    <>
      <GradeChip state={state}>{name}</GradeChip>
      <span>{why}</span>
    </>
  );
}

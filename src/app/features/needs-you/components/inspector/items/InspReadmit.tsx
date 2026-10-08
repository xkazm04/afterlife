import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { KeyValue } from '@/components/inspector/KeyValue';
import { UntrustedText } from '@/components/inspector/UntrustedText';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { TierMark } from '@/components/status/TierMark';
import { READMIT, readmitCooldown } from '../../../data/readmit';
import { Chip } from '@/components/status/chip/Chip';
import { ActBtn, Acts } from '../Acts';
import type { InspProps } from '../props';
import { retireText } from '../../../model/act';
import { PolicyCmdSec, PolicyDiffSec } from '../PolicyWrite';
import { ClickSec, Sec } from '../Sec';
import styles from './items.module.css';

/** n4: re-admit a quarantined class (or retire it). The incident note is read before Re-admit is allowed. */
export function InspReadmit(p: InspProps) {
  const { s, demo, dispatch } = p;
  const st = s.status.n4;
  const { incident, record } = demo;
  const cooldown = readmitCooldown(demo.readmit.cooldownDays);
  return (
    <>
      <InspectorHeader
        title={demo.readmit.title}
        sub={
          <span className={styles.subrow}>
            {st === 'retired' ? <Chip compact>retired</Chip> : <TierMark tier="quarantined" />}
            <span>{demo.readmit.reason}</span>
            <HonestyChip kind="seeded" />
          </span>
        }
        path={`tier-state.yml · tripwire e7f19d0 · ${READMIT.openedAt}`}
      />
      {st === 'open' || st === 'staged' ? (
        <Acts>
          {st === 'open' ? (
            <>
              <ActBtn dispatch={dispatch} action="read-note">
                {s.read.note ? 'Note read ✓' : 'Read the incident note'}
              </ActBtn>
              <ActBtn dispatch={dispatch} action="stage-n4" variant="primary" disabled={!s.read.note} title={s.read.note ? undefined : 'Read the note first'}>
                Re-admit as Assisted
              </ActBtn>
            </>
          ) : (
            <ActBtn dispatch={dispatch} action="unstage:n4" variant="ghost">
              Take it back
            </ActBtn>
          )}
          <ActBtn dispatch={dispatch} action="retire-n4" variant="danger">
            {st === 'open' ? 'Retire' : 'Retire instead'}
          </ActBtn>
        </Acts>
      ) : null}
      <Sec k="n4-note" title="Incident note" aux={`${READMIT.note} · ${s.read.note ? 'read' : 'unread'}`} def={s.read.note} p={p}>
        <div className={`${styles.muted} ${styles.gap}`}>
          {incident.title} · {incident.reason}
        </div>
        <div className={`${styles.ul} ${styles.gap}`}>Quoted hunk · untrusted text</div>
        <UntrustedText source={`${READMIT.mr} changelog`}>{incident.quote}</UntrustedText>
        <div className={styles.gap}>
          {READMIT.timeline.map(([at, track, text]) => (
            <div key={at} className={styles.ev}>
              <span className={styles.tm}>{at}</span>
              <span className={styles.tk}>{track}</span>
              <span className={styles.tx}>{text}</span>
            </div>
          ))}
        </div>
        <KeyValue
          rows={[
            ['Record at the trip', `${record.accepted} acc · ${Math.round(record.noEdit * 100)} % · ${record.reverts} revert`],
            [
              'Old tier',
              <span key="old">
                <TierMark tier="supervised" /> not on offer
              </span>,
            ],
            ['Cooldown', cooldown.cooldown],
          ]}
        />
      </Sec>
      <PolicyDiffSec k="n4" title="Re-admission MR diff" p={p} />
      <Sec k="n4-retire" title="Retire · no write" aux="no outbox" def={false} p={p}>
        <div className={styles.muted}>{retireText(demo.readmit.cls)}</div>
      </Sec>
      <ClickSec k="n4-click" p={p} does={READMIT.does} doesNot={cooldown.doesNot} />
      <PolicyCmdSec k="n4" title="Command · re-admit" p={p} />
    </>
  );
}

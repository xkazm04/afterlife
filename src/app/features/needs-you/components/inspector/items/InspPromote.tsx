import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { PROMOTE, PROOFS } from '../../../data/promote';
import { Chip } from '@/components/status/chip/Chip';
import { DiffBlock } from '@/components/inspector/blocks/DiffBlock';
import { TierMove } from '../../shared/MoveMarks';
import { ActBtn, Acts } from '../Acts';
import type { InspProps } from '../props';
import { ClickSec, CommandSec, Sec } from '../Sec';
import styles from './items.module.css';

/** n1: promote a class from Supervised to Hands-off. Rules, the 16 accepted proofs, the policy-MR diff. */
export function InspPromote(p: InspProps) {
  const { s, demo, dispatch } = p;
  const st = s.status.n1;
  const { promote } = demo;
  const met = promote.rules.filter((r) => r[2]).length;
  return (
    <>
      <InspectorHeader
        title={promote.title}
        sub={
          <span className={styles.subrow}>
            <TierMove from={promote.from} to={promote.to} />
            <span>
              proposed {PROMOTE.openedAt} · ledger {PROMOTE.sourceAt}
            </span>
          </span>
        }
        path={PROMOTE.policy}
      />
      <Acts>
        {st === 'open' ? (
          <>
            <ActBtn dispatch={dispatch} action="stage-n1" variant="primary">
              Promote · open policy MR
            </ActBtn>
            <ActBtn dispatch={dispatch} action="snooze-n1" variant="ghost">
              Not yet
            </ActBtn>
          </>
        ) : null}
        {st === 'staged' ? (
          <>
            <ActBtn dispatch={dispatch} action="unstage:n1" variant="ghost">
              Take it back
            </ActBtn>
            <ActBtn dispatch={dispatch} action="out-on" variant="ghost">
              Show in outbox
            </ActBtn>
          </>
        ) : null}
        {st === 'sent' ? (
          <ActBtn dispatch={dispatch} action="merge-n1" variant="ghost">
            Simulate: you merged it
          </ActBtn>
        ) : null}
        {st === 'snoozed' ? (
          <ActBtn dispatch={dispatch} action="unsnooze-n1" variant="ghost">
            Show it again
          </ActBtn>
        ) : null}
      </Acts>
      <Sec k="n1-rules" title="Promotion rules" aux={`${met} / ${promote.rules.length} met`} p={p}>
        {promote.rules.map(([rule, value, ok]) => (
          <div key={rule} className={styles.rl}>
            <span>{rule}</span>
            <span className={styles.v}>{value}</span>
            <span className={ok ? styles.yes : styles.no} aria-label={ok ? 'met' : 'not met'}>
              {ok ? '✓' : '✕'}
            </span>
          </div>
        ))}
        <div className={`${styles.muted} ${styles.gap}`}>rules are policy parameters, not measurements</div>
      </Sec>
      <Sec k="n1-proofs" title="Accepted proofs" aux={`${PROOFS.length} · 94 % no edit`} def={false} p={p}>
        {PROOFS.map((pr) => (
          <div key={pr.mr} className={styles.pr}>
            <span className={styles.m}>{pr.mr}</span>
            <span className={styles.t} title={pr.title}>
              {pr.title} {pr.edited ? <Chip compact>edited</Chip> : null}
            </span>
            <span className={styles.w}>{pr.when}</span>
          </div>
        ))}
      </Sec>
      <Sec k="n1-diff" title="Policy MR diff" aux={PROMOTE.write.ref} p={p}>
        <DiffBlock file={PROMOTE.write.file} lines={PROMOTE.write.diff} />
      </Sec>
      <ClickSec k="n1-click" p={p} does={PROMOTE.does} doesNot={PROMOTE.doesNot} />
      <CommandSec k="n1-cmd" p={p} commands={PROMOTE.write.commands} def={false} />
    </>
  );
}

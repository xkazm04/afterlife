import { Kbd } from '@/components/controls/Kbd';
import { UntrustedText } from '@/components/inspector/UntrustedText';
import { Chip } from '@/components/status/chip/Chip';
import { ObjectLink } from '@/components/controls/ObjectLink';
import { StatusTag } from '../StatusTag';
import type { TaskView } from '../../model/types';
import { linkLabel, type Selection } from '../../model/court/selection';
import { checkGlyph, checkKind, claimStatus, ruleWord } from '../../model/verdict/verdict';
import styles from './inspector.module.css';

function CheckRuling({ task, id }: { task: TaskView; id: string }) {
  const c = task.proof.checks.find((x) => x.id === id);
  if (!c) return null;
  const link = task.chain[c.link];
  const kind = checkKind(c.ok);
  return (
    <div className={styles.rl}>
      <div className={styles.hh}>
        <span className={styles[`c_${kind}`]}>{checkGlyph(c.ok)}</span>
        <span className={styles.mono}>{c.id}</span>
        <span className={styles.push}>
          <StatusTag kind={kind}>{ruleWord(c.ok)}</StatusTag>
        </span>
      </div>
      {c.text}
      <dl className={styles.kv}>
        <dt>Evidence</dt>
        <dd>
          <ObjectLink target={c.ref} />
        </dd>
        <dt>From</dt>
        <dd>
          {link ? (
            <>
              {linkLabel(task, c.link)} · {link.at ?? '—'} {link.ref ? <ObjectLink target={link.ref} /> : null}
            </>
          ) : (
            linkLabel(task, c.link)
          )}
        </dd>
        <dt>Tests</dt>
        <dd>
          {c.claims.length ? (
            c.claims.map((cid) => (
              <div key={cid}>
                <b>{cid}</b> <span className={styles.quote}>“{task.claims.find((x) => x.id === cid)?.text}”</span>
              </div>
            ))
          ) : (
            <Chip tone="invariant">engine invariant</Chip>
          )}
        </dd>
      </dl>
    </div>
  );
}

function ClaimRuling({ task, id }: { task: TaskView; id: string }) {
  const c = task.claims.find((x) => x.id === id);
  if (!c) return null;
  const st = claimStatus(task, c);
  return (
    <div className={styles.rl}>
      <div className={styles.hh}>
        <span className={`${styles.mono} ${styles.claimId}`}>{c.id}</span>
        <span className={styles.tl}>{task.agent}</span>
        <span className={styles.push}>
          <StatusTag kind={st.kind}>{st.label}</StatusTag>
        </span>
      </div>
      <div className={`${styles.words} ${styles.noLig}`}>
        <UntrustedText source={task.agent}>{c.text}</UntrustedText>
      </div>
      <dl className={styles.kv}>
        <dt>Tested by</dt>
        <dd>
          {c.checks.length ? (
            c.checks.map((cid) => {
              const ok = task.proof.checks.find((x) => x.id === cid)?.ok ?? null;
              return (
                <div key={cid} className={`${styles.mono} ${styles[`c_${checkKind(ok)}`]}`}>
                  {checkGlyph(ok)} {cid}
                </div>
              );
            })
          ) : (
            <span className={styles.c_unk}>nothing · no weight</span>
          )}
        </dd>
        <dt>In verdict</dt>
        <dd>never a term</dd>
      </dl>
    </div>
  );
}

/** The inspector's "Selection": the ruling on the selected check or claim, or the keys that select one. */
export function SelectionRuling({ task, sel }: { task: TaskView; sel: Selection }) {
  if (!sel)
    return (
      <div className={styles.muted}>
        No selection · <Kbd>↑</Kbd> <Kbd>↓</Kbd> <Kbd>←</Kbd> <Kbd>→</Kbd>
      </div>
    );
  return sel.side === 'check' ? <CheckRuling task={task} id={sel.id} /> : <ClaimRuling task={task} id={sel.id} />;
}

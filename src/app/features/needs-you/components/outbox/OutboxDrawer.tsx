import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { Icon } from '@/components/icons/Icon';
import { OPERATOR } from '../../data/constants';
import type { Action, NeedsState } from '../../model/types';
import { OutboxItem } from './OutboxItem';
import styles from './OutboxDrawer.module.css';

// kit-candidate: BottomDrawer, a titled panel docked under a pane with a count, a hide button and a scrolling list.
/** Every write waits here for Run: the exact command and diff first, nothing runs until you press it. */
export function OutboxDrawer({ s, dispatch }: { s: NeedsState; dispatch: (a: Action) => void }) {
  if (!s.outboxOpen) return null;
  const n = s.out.length;
  return (
    <section className={`${styles.ob} ${!n && !s.sent.length ? styles.compact : ''}`} aria-label="Outbox">
      <div className={styles.head}>
        <b>Outbox</b>
        <span className={`${styles.n} ${n ? styles.nOn : ''}`}>{n}</span>
        <span>
          nothing runs until you press Run · as <span className={styles.mono}>{OPERATOR}</span>
        </span>
        <span className={styles.close}>
          <ToolbarButton title="Hide outbox" aria-label="Hide outbox" onClick={() => dispatch({ type: 'act', action: 'out-off' })}>
            <Icon name="close" />
          </ToolbarButton>
        </span>
      </div>
      <div className={styles.list} aria-live="polite">
        {n ? (
          s.out.map((o) => <OutboxItem key={o.key} item={o} open={!s.itemsShut.includes(o.key)} selected={s.sel === o.key} dispatch={dispatch} />)
        ) : (
          <div className={styles.empty}>Empty · a decision stages its exact write here. Retire and Not yet skip the outbox.</div>
        )}
        {s.sent.length ? (
          <div className={styles.sent}>
            <h3>Sent this session · {s.sent.length}</h3>
            {s.sent.map((t) => (
              <div key={t}>
                <b>✓</b> {t}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

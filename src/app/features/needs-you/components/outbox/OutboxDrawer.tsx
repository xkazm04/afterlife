import { BottomDrawer } from '@/components/shell/BottomDrawer';
import { OPERATOR } from '../../data/constants';
import type { Action, NeedsState } from '../../model/types';
import { OutboxItem } from './OutboxItem';
import styles from './OutboxDrawer.module.css';

/** Every write waits here for Run: the exact command and diff first, nothing runs until you press it. */
export function OutboxDrawer({ s, dispatch }: { s: NeedsState; dispatch: (a: Action) => void }) {
  if (!s.outboxOpen) return null;
  const n = s.out.length;
  return (
    <BottomDrawer
      title="Outbox"
      count={n}
      hint={
        <>
          nothing runs until you press Run · as <span className={styles.mono}>{OPERATOR}</span>
        </>
      }
      closeLabel="Hide outbox"
      compact={!n && !s.sent.length}
      onClose={() => dispatch({ type: 'act', action: 'out-off' })}
    >
      <div className={styles.list}>
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
    </BottomDrawer>
  );
}

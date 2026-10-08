import { Button } from '@/components/controls/Button';
import { Icon } from '@/components/icons/Icon';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import type { Action, OutItem } from '../../model/types';
import { DiffBlock } from '@/components/inspector/blocks/DiffBlock';
import { ServerCommands } from '@/components/write/ServerCommands';
import type { WriteEntry } from '@/components/write/useServerWrites';
import styles from './OutboxItem.module.css';

/**
 * One staged write: its kind, title and write ref, Run and Remove, and (open) the exact commands and diff. When the
 * server plans the write, the commands shown are the server's, and Run waits until they are planned (a refusal is
 * shown and Run stays off).
 */
export function OutboxItem({
  item,
  open,
  selected,
  write,
  dispatch,
  onRun,
}: {
  item: OutItem;
  open: boolean;
  selected: boolean;
  write?: WriteEntry;
  dispatch: (a: Action) => void;
  onRun: (key: string) => void;
}) {
  const ready = !write || write.status === 'preview';
  const cls = [styles.oi, item.clock ? styles.clock : '', selected ? styles.sel : '', open ? styles.open : ''].filter(Boolean).join(' ');
  return (
    <div className={cls} data-key={item.key}>
      <div className={styles.head} onClick={() => dispatch({ type: 'select', id: item.key })}>
        <button
          type="button"
          className={styles.disc}
          aria-expanded={open}
          aria-label={open ? 'Collapse the commands' : 'Show the commands'}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'itemShut', key: item.key });
          }}
        >
          <Icon name="disc" />
        </button>
        <span className={styles.k}>{item.kind}</span>
        <span className={styles.t} title={item.title}>
          {item.title}
        </span>
        <span className={styles.ref}>{item.ref}</span>
        <Button
          variant={item.clock ? 'primary' : 'accent'}
          disabled={!ready}
          title={write?.status === 'refused' ? write.reason : write?.status === 'planning' ? 'Planning on the server…' : undefined}
          onClick={(e) => {
            e.stopPropagation();
            onRun(item.key);
          }}
        >
          Run
        </Button>
        <Button variant="ghost" onClick={() => dispatch({ type: 'remove', key: item.key })}>
          Remove
        </Button>
      </div>
      {open ? (
        <div className={styles.body}>
          {write ? (
            <ServerCommands entry={write} fallback={item.commands} label={`Commands for ${item.title}`} />
          ) : (
            <CommandBlock commands={item.commands} label={`Commands for ${item.title}`} />
          )}
          {item.diff ? <DiffBlock file={item.file} lines={item.diff} /> : null}
        </div>
      ) : null}
    </div>
  );
}

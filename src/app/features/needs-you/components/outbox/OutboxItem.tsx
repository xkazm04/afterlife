import { Button } from '@/components/controls/Button';
import { Icon } from '@/components/icons/Icon';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import type { Action, OutItem } from '../../model/types';
import { DiffBlock } from '../shared/DiffBlock';
import styles from './OutboxItem.module.css';

/** One staged write: its kind, title and write ref, Run and Remove, and (open) the exact commands and diff. */
export function OutboxItem({ item, open, selected, dispatch }: { item: OutItem; open: boolean; selected: boolean; dispatch: (a: Action) => void }) {
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
        <Button variant={item.clock ? 'primary' : 'accent'} onClick={() => dispatch({ type: 'run', key: item.key })}>
          Run
        </Button>
        <Button variant="ghost" onClick={() => dispatch({ type: 'remove', key: item.key })}>
          Remove
        </Button>
      </div>
      {open ? (
        <div className={styles.body}>
          <CommandBlock commands={item.commands} label={`Commands for ${item.title}`} />
          {item.diff ? <DiffBlock file={item.file} diff={item.diff} /> : null}
        </div>
      ) : null}
    </div>
  );
}

import type { Ref } from 'react';
import { Spacer } from '@/components/controls/Spacer';
import { SearchField } from '@/components/controls/toolbar/SearchField';
import { SegmentedControl, type SegmentOption } from '@/components/controls/toolbar/SegmentedControl';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import type { Action, GroupMode, NeedsState } from '../../model/types';
import { OutboxIcon } from './OutboxIcon';
import styles from './chrome.module.css';

const GROUPS: readonly SegmentOption<GroupMode>[] = [
  { value: 'kind', label: 'By kind', title: 'Group by kind of decision' },
  { value: 'project', label: 'By project', title: 'Group by the repository the write lands in' },
  { value: 'deadline', label: 'By deadline', title: 'Group by deadline' },
];

/** Toolbar: Group by, the Outbox toggle with its count, and the search box ("/" focuses it). */
export function NeedsToolbar({ s, dispatch, searchRef }: { s: NeedsState; dispatch: (a: Action) => void; searchRef: Ref<HTMLInputElement> }) {
  return (
    <>
      <SegmentedControl label="Group by" options={GROUPS} value={s.group} onChange={(mode) => dispatch({ type: 'group', mode })} />
      <Spacer />
      <ToolbarButton pressed={s.outboxOpen} title="Show or hide the outbox: every write waits here for Run" onClick={() => dispatch({ type: 'act', action: 'out-toggle' })}>
        <span className={styles.btn}>
          <OutboxIcon />
          <span>Outbox</span>
          {s.out.length ? <span className={styles.badge}>{s.out.length}</span> : null}
        </span>
      </ToolbarButton>
      <SearchField value={s.query} onChange={(query) => dispatch({ type: 'query', query })} label="Search decisions" inputRef={searchRef} />
    </>
  );
}

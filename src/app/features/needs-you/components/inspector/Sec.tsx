import type { ReactNode } from 'react';
import { DetailSection } from '@/components/shell/detail/DetailPage';
import { DoesNot } from '../shared/DoesNot';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import type { InspProps } from './props';
import styles from './inspector.module.css';

/**
 * A detail card whose open state lives in the screen state (so "Read the draft" can open it). A card that starts closed
 * keeps its heading and a Show button; the read-before-act gates open on the section being opened.
 */
export function Sec({ k, title, aux, def = true, p, children }: { k: string; title: string; aux?: ReactNode; def?: boolean; p: Pick<InspProps, 's' | 'dispatch'>; children: ReactNode }) {
  const open = p.s.sections[k] ?? def;
  const toggle = (
    <button type="button" className={styles.tog} aria-expanded={open} aria-label={`${open ? 'Hide' : 'Show'} ${title}`} onClick={() => p.dispatch({ type: 'section', key: k, open: !open })}>
      {open ? 'Hide' : 'Show'}
    </button>
  );
  return (
    <div id={`insp-${k}`} className={styles.sec}>
      <DetailSection
        title={title}
        aux={
          <>
            {aux}
            {def ? null : toggle}
          </>
        }
      >
        {open ? children : null}
      </DetailSection>
    </div>
  );
}

/** "The click": what the button does and what it will not do. */
export function ClickSec({ k, p, does, doesNot }: { k: string; p: Pick<InspProps, 's' | 'dispatch'>; does: readonly string[]; doesNot: readonly string[] }) {
  return (
    <Sec k={k} title="The click" p={p}>
      <DoesNot does={does} doesNot={doesNot} />
    </Sec>
  );
}

/** "Command": the exact commands, shown before anything runs. */
export function CommandSec({ k, p, commands, aux, title = 'Command', def = true }: { k: string; p: Pick<InspProps, 's' | 'dispatch'>; commands: string | readonly string[]; aux?: ReactNode; title?: string; def?: boolean }) {
  return (
    <Sec k={k} title={title} aux={aux} def={def} p={p}>
      <CommandBlock commands={commands} />
    </Sec>
  );
}

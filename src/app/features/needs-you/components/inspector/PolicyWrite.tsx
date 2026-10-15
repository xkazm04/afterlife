import { Button } from '@/components/controls/Button';
import { DiffBlock } from '@/components/inspector/blocks/DiffBlock';
import { parseDiff } from '@/components/inspector/blocks/diff';
import { commandLines, type WriteView } from '@/server/actions/words';
import { policyNote } from '../../model/outbox/policy';
import { canAsk } from '../../model/slot/slot';
import type { PolicyKey } from '../../model/types';
import type { InspProps } from './props';
import { CommandSec, Sec } from './Sec';
import styles from './items/items.module.css';

const FILE = 'belay-policy · tier-state.yml';

/**
 * The policy MR's tier-state.yml diff exactly as the server planned it, under what Run does with it. A write that was
 * refused, or whose last send got no answer, can be asked for again here.
 */
export function PolicyDiffSec({ k, title, p }: { k: PolicyKey; title: string; p: InspProps }) {
  const view: WriteView | undefined = p.s.writes[k];
  return (
    <Sec k={`${k}-diff`} title={title} aux="new MR · belay-policy" p={p}>
      <div className={`${styles.muted} ${styles.gap}`}>{policyNote(view)}</div>
      {canAsk(p.s.slots?.[k]) ? <Button onClick={() => p.dispatch({ type: 'retry', key: k })}>Ask again</Button> : null}
      {view?.kind === 'preview' ? <DiffBlock file={FILE} lines={parseDiff(view.preview.diff)} /> : null}
    </Sec>
  );
}

/** The exact commands Run sends, as the server planned them (closed until opened). Nothing until they have come. */
export function PolicyCmdSec({ k, title, p }: { k: PolicyKey; title?: string; p: InspProps }) {
  const view = p.s.writes[k];
  if (view?.kind === 'preview') return <CommandSec k={`${k}-cmd`} p={p} commands={commandLines(view.preview)} title={title} def={false} />;
  return (
    <Sec k={`${k}-cmd`} title={title ?? 'Command'} def={false} p={p}>
      <div className={styles.muted}>{policyNote(view)}</div>
    </Sec>
  );
}

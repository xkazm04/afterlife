// kit-candidate: CommandPre - a command block with dim comment lines and trailing notes (CommandBlock prefixes every
// line with "$ ", which is wrong for comments). Promote as an option of inspector/CommandBlock.
import { Button } from '@/components/controls/Button';
import { Spacer } from '@/components/controls/Spacer';
import { Sheet } from '@/components/overlays/Sheet';
import { TierChip } from '@/components/status/TierChip';
import { commandLines, sendLabel } from '../../model/flow/commands';
import type { Gap } from '../../model/ctx';
import styles from './SendSheet.module.css';

/**
 * "Send as you": the exact commands Belay would run for each picked gap, shown before anything is written. Belay holds
 * no merge token; you merge each MR in GitLab. Escape or Cancel closes it; the primary button (or Enter) sends.
 */
export function SendSheet({ gaps, onCancel, onSend }: { gaps: readonly Gap[]; onCancel: () => void; onSend: () => void }) {
  const mrs = gaps.filter((g) => g.x.kind === 'mr').length;
  const label = sendLabel(mrs, gaps.length - mrs);
  return (
    <Sheet
      title={label}
      subtitle="your glab login · Belay holds no merge token · you merge each MR in GitLab"
      onClose={onCancel}
      footer={
        <>
          <span className={styles.count}>{`${gaps.length} command set${gaps.length > 1 ? 's' : ''} · one MR per gap`}</span>
          <Spacer />
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={onSend}>
            {label}
          </Button>
        </>
      }
    >
      {gaps.map((g) => (
        <div key={g.id} className={styles.group}>
          <div className={styles.head}>
            <span className={styles.id}>{g.id}</span>
            <span className={styles.title}>{g.title}</span>
            {g.x.kind === 'mr' ? <TierChip tier="assisted" /> : <span className={styles.ro}>probe · read only</span>}
          </div>
          <pre className={styles.cmd} aria-label={`Commands for gap ${g.id}`}>
            {commandLines(g).map((l, i) => (
              <span key={i} className={styles.line}>
                {l.code}
                {l.note ? <span className={styles.note}>{l.code ? `   ${l.note}` : l.note}</span> : null}
                {'\n'}
              </span>
            ))}
          </pre>
        </div>
      ))}
    </Sheet>
  );
}

import { Button } from '@/components/controls/Button';
import { Spacer } from '@/components/controls/Spacer';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import { DiffBlock } from '@/components/inspector/blocks/DiffBlock';
import { parseDiff } from '@/components/inspector/blocks/diff';
import { Sheet } from '@/components/overlays/Sheet';
import { TierChip } from '@/components/status/TierChip';
import { commandLines } from '@/server/actions/words';
import { sendLabel } from '../../model/flow/commands';
import type { GapSheetApi } from '../../hooks/useGapSheet';
import type { SheetRow } from '../../write/sheet';
import styles from './SendSheet.module.css';

function Write({ row, onRetry }: { row: SheetRow; onRetry: (id: string) => void }) {
  if (!row.send.ok) return <div className={styles.note}>{row.send.reason}</div>;
  if (!row.view) return <div className={styles.note}>Asking Belay for the exact write…</div>;
  if (row.view.kind === 'refused') {
    return (
      <div className={styles.note}>
        Belay refuses this write: {row.view.reason}. Nothing can run.{' '}
        <Button onClick={() => onRetry(row.id)}>Ask again</Button>
      </div>
    );
  }
  const { preview } = row.view;
  return (
    <>
      <div className={styles.note}>{preview.mode === 'demo' ? 'Demo: sending simulates this write; nothing is sent to GitLab.' : preview.summary}</div>
      <CommandBlock commands={commandLines(preview)} prompt={false} label={`Commands for gap ${row.id}`} />
      <DiffBlock file={`gap ${row.id}`} lines={parseDiff(preview.diff)} />
    </>
  );
}

/**
 * "Send as you": each picked gap's exact write as the server planned it (commands and diff), shown before anything is
 * written. The button confirms each preview on screen by its id; each gap's answer is only what the response says. Belay
 * holds no merge token; you merge each MR in GitLab. A probe has no server door yet and says so. Escape or Close closes it.
 */
export function SendSheet({ api, onClose }: { api: GapSheetApi; onClose: () => void }) {
  const { rows, ready, sending, send, retry } = api;
  const done = rows.some((r) => r.answer?.status === 'done');
  return (
    <Sheet
      title={ready || done ? sendLabel(ready || rows.filter((r) => r.answer?.status === 'done').length) : 'Nothing to send yet'}
      subtitle="your glab login · Belay holds no merge token · you merge each MR in GitLab"
      onClose={onClose}
      footer={
        <>
          <span className={styles.count}>{`${rows.length} gap${rows.length > 1 ? 's' : ''} · ${ready} ready to send · one MR per gap`}</span>
          <Spacer />
          <Button onClick={onClose}>{done ? 'Close' : 'Cancel'}</Button>
          {ready ? (
            <Button variant="primary" onClick={send} disabled={sending} title="Confirms each write above by its preview id">
              {sending ? 'Sending…' : sendLabel(ready)}
            </Button>
          ) : null}
        </>
      }
    >
      {rows.map((row) => (
        <div key={row.id} className={styles.group}>
          <div className={styles.head}>
            <span className={styles.id}>{row.id}</span>
            <span className={styles.title}>{row.title}</span>
            {row.send.ok ? <TierChip tier="assisted" /> : <span className={styles.ro}>not sent</span>}
          </div>
          {row.answer?.status === 'done' ? null : <Write row={row} onRetry={retry} />}
          {row.answer ? (
            <div role="status" className={row.answer.status === 'done' ? styles.done : styles.bad}>
              {row.answer.text}
            </div>
          ) : null}
        </div>
      ))}
    </Sheet>
  );
}

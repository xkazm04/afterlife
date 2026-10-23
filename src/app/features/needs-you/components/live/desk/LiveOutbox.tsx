import { useState } from 'react';
import { Button } from '@/components/controls/Button';
import { parseDiff } from '@/components/inspector/blocks/diff';
import { BottomDrawer } from '@/components/shell/BottomDrawer';
import type { NeedsYouItem } from '@/lib/demo';
import { commandLines, type WriteView } from '@/server/actions/words';
import type { DeskItem, DeskOut } from '../../../model/desk';
import type { LiveAnswer } from '../../../model/live';
import { policyNote } from '../../../model/outbox/policy';
import type { Action, OutItem } from '../../../model/types';
import { OutboxItem } from '../../outbox/OutboxItem';
import drawer from '../../outbox/OutboxDrawer.module.css';
import styles from './desk.module.css';

const STATE_WORD = { staged: 'staged', running: 'running…', done: 'done', refused: 'refused', failed: 'failed' } as const;

/** A staged row as the demo's outbox card draws it: the server's commands and diff, or why there are none yet. */
export function outItemOf(n: DeskItem, view: WriteView | undefined, out: DeskOut): OutItem {
  const r = out.result[n.id];
  const gap = n.intent?.kind === 'apply-gap-template';
  const base = {
    key: n.id, kind: gap ? 'gap MR' : 'policy MR', title: n.title, ref: r ? STATE_WORD[r.state] : 'staged',
    note: r?.text ?? policyNote(view), askable: view?.kind === 'refused' && !out.running, runnable: !out.running && r?.state !== 'running',
  };
  if (view?.kind !== 'preview') return { ...base, commands: [] };
  return { ...base, commands: commandLines(view.preview), file: gap ? `${n.project} · ${view.preview.branch ?? 'new branch'}` : 'belay-policy · tier-state.yml', diff: parseDiff(view.preview.diff) };
}

export interface LiveOutboxProps {
  rows: readonly DeskItem[];
  out: DeskOut;
  views: Readonly<Record<string, WriteView>>;
  /** Rows a done confirm sent this session (they leave the rows on the refresh), and each one's answer. */
  sent: Readonly<Record<string, NeedsYouItem>>;
  answers: Readonly<Record<string, LiveAnswer>>;
  sel: string | null;
  onSelect: (id: string) => void;
  onRun: (id: string) => void;
  onRunAll: () => void;
  onRetry: (id: string) => void;
  onUnstage: (id: string) => void;
  onClose: () => void;
}

/** The outbox: staged writes in staging order, Run all (each in turn, past a refused or failed one), then what was sent. */
export function LiveOutbox(p: LiveOutboxProps) {
  const [shut, setShut] = useState<readonly string[]>([]);
  const staged = p.out.order.filter((id) => !p.sent[id]).flatMap((id) => p.rows.filter((n) => n.id === id));
  const sent = Object.values(p.sent);
  // the demo card's actions, mapped onto this desk's: Run, Remove (unstage), Ask again, select, open or shut
  const dispatch = (a: Action) => {
    if (a.type === 'run') p.onRun(a.key);
    else if (a.type === 'remove') p.onUnstage(a.key);
    else if (a.type === 'retry') p.onRetry(a.key);
    else if (a.type === 'select') p.onSelect(a.id);
    else if (a.type === 'itemShut') setShut((s) => (s.includes(a.key) ? s.filter((k) => k !== a.key) : [...s, a.key]));
  };
  return (
    <BottomDrawer title="Outbox" count={staged.length} hint="nothing runs until you press Run · as your glab login" closeLabel="Hide outbox" compact={!staged.length && !sent.length} onClose={p.onClose}>
      <div className={drawer.list}>
        {staged.length ? (
          <>
            <div className={styles.runall}>
              <Button variant="primary" disabled={p.out.running} onClick={p.onRunAll} title="Confirms each staged write's current preview, in this order; a refused or failed one does not stop the rest">
                {p.out.running ? 'Running…' : `Run all · ${staged.length}`}
              </Button>
              <span className={styles.note}>A person merges each MR in GitLab; Belay never does.</span>
            </div>
            {staged.map((n) => <OutboxItem key={n.id} item={outItemOf(n, p.views[n.id], p.out)} open={!shut.includes(n.id)} selected={p.sel === n.id} dispatch={dispatch} />)}
          </>
        ) : (
          <div className={drawer.empty}>Empty · Stage a decision (Space) to put its exact write here for Run all.</div>
        )}
        {sent.length ? (
          <section className={drawer.sent} aria-label="Sent this session">
            <h3>Sent this session · {sent.length}</h3>
            {sent.map((n) => (
              <div key={n.id} title={`${n.title} · ${p.answers[n.id]?.text ?? ''}`}>
                <b>✓</b> {n.title} · <span role="status">{p.answers[n.id]?.text}</span>
              </div>
            ))}
            <div className={styles.note}>A person merges the MR in GitLab; the proposal leaves the list when the poll sees it closed.</div>
          </section>
        ) : null}
      </div>
    </BottomDrawer>
  );
}

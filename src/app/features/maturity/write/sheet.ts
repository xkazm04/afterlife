// What the Send sheet holds per picked gap, and the two things it does with the server: ask for each gap's exact write when
// the sheet opens (askGapMr), and on the button confirm each write that is on screen by its preview id (sendGapMr). The
// answer is only what the response says. Pure apart from those two calls, so it is tested with the actions mocked.
import { NO_ANSWER, outcomeOf, type Outcome, type WriteView } from '@/server/actions/words';
import { askGapMr, sendGapMr, type GapSend } from './gap';

/** What the response said of one gap's send: done names the MR GitLab opened; changed, refused and failed say so. */
export interface GapAnswer {
  status: Outcome['status'];
  text: string;
  /** The MR GitLab opened ("!22"), when the response names one. */
  mr?: string;
}

export interface SheetRow {
  id: string;
  title: string;
  send: GapSend;
  /** The server's preview of the write, or why there is none; absent while it is asked for. */
  view?: WriteView;
  answer?: GapAnswer;
}

/** The rows whose write has not been asked for yet. A gap that is not sent never asks. */
export const toAsk = (rows: readonly SheetRow[]): SheetRow[] => rows.filter((r) => r.send.ok && !r.view);

/** The rows with a preview on screen that have not been sent: what the button confirms. */
export const readyRows = (rows: readonly SheetRow[]): SheetRow[] => rows.filter((r) => r.send.ok && r.view?.kind === 'preview' && r.answer?.status !== 'done');

export const ask = async (row: SheetRow): Promise<WriteView> => (row.send.ok ? askGapMr(row.send.intent) : { kind: 'refused', reason: row.send.reason });

export interface Sent {
  id: string;
  answer: GapAnswer;
  /** The new write on screen (changed) or why there is none (refused). */
  view?: WriteView;
}

/** Confirm every ready row by its own preview id. One gap's failure does not stop the others. */
export function sendReady(rows: readonly SheetRow[]): Promise<Sent[]> {
  return Promise.all(readyRows(rows).map(async (row): Promise<Sent> => {
    if (!row.send.ok) return { id: row.id, answer: { status: 'failed', text: row.send.reason } };
    try {
      const r = await sendGapMr(row.send.intent, row.view);
      const o = r && outcomeOf(r, `gap ${row.id} · ${row.title}`);
      if (!o) return { id: row.id, answer: { status: 'failed', text: 'Nothing sent · the exact write is not on screen' } };
      const mr = r?.status === 'done' ? r.results.flatMap((x) => (x.made?.startsWith('!') ? [x.made] : []))[0] : undefined;
      const view: WriteView | undefined = o.status === 'changed' ? { kind: 'preview', preview: o.preview } : o.status === 'refused' ? { kind: 'refused', reason: o.reason } : undefined;
      return { id: row.id, answer: { status: o.status, text: o.text, ...(mr ? { mr } : {}) }, ...(view ? { view } : {}) };
    } catch {
      return { id: row.id, answer: { status: 'failed', text: NO_ANSWER } };
    }
  }));
}

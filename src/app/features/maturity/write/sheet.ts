// What the Send sheet shows per gap, read from the layout's state (model/flow/send.ts holds each gap's write), and the two
// things it does with the server: ask for each gap's exact write when the sheet opens (askGapMr), and on the button confirm
// each write that is on screen by its preview id (sendGapMr). The answer is only what the response says. Pure apart from
// those two calls, so it is tested with the actions mocked.
import { mrOf, NO_ANSWER, outcomeOf, type WriteView } from '@/server/actions/words';
import type { ProposalExtra } from '../data/types';
import type { MaturityCtx } from '../model/ctx';
import { sheetIds, type GapAnswer, type SendPhase } from '../model/flow/send';
import type { MaturityState } from '../model/state';
import { askGapMr, gapSend, sendGapMr, type DataMode, type GapSend } from './gap';

export type { GapAnswer };

export interface SheetRow {
  id: string;
  title: string;
  /** The proposal's own tier (null for the read-only probe). */
  tier: ProposalExtra['tier'];
  send: GapSend;
  /** The server's preview of the write, or why there is none; absent while it is asked for. */
  view?: WriteView;
  answer?: GapAnswer;
  /** Where its write is; absent before it is asked for. */
  phase?: SendPhase;
}

/** The sheet's rows, from the state alone: a remounted screen shows the same writes and answers. */
export function sheetRows(s: MaturityState, ctx: MaturityCtx, project: string, mode: DataMode): SheetRow[] {
  return sheetIds(s, ctx).flatMap((id) => {
    const g = ctx.gap(id);
    const slot = s.send[id];
    if (!g) return [];
    return [{ id, title: g.title, tier: g.x.tier, send: gapSend(project, g, mode), ...(slot?.view ? { view: slot.view } : {}), ...(slot?.answer ? { answer: slot.answer } : {}), ...(slot ? { phase: slot.phase } : {}) }];
  });
}

/** The rows whose write has not been asked for yet. A gap that is not sent never asks. */
export const toAsk = (rows: readonly SheetRow[]): SheetRow[] => rows.filter((r) => r.send.ok && !r.view && !r.phase);

/** The rows with a preview on screen that are neither sent nor sending: what the button confirms. */
export const readyRows = (rows: readonly SheetRow[]): SheetRow[] =>
  rows.filter((r) => r.send.ok && r.view?.kind === 'preview' && r.answer?.status !== 'done' && r.phase !== 'sending');

export const ask = async (row: SheetRow): Promise<WriteView> => (row.send.ok ? askGapMr(row.send.intent) : { kind: 'refused', reason: row.send.reason });

export interface Sent {
  id: string;
  answer: GapAnswer;
  /** The new write on screen (changed) or why there is none (refused). */
  view?: WriteView;
}

/** Confirm every ready row by its own preview id. One gap's failure does not stop the others. */
export const sendReady = (rows: readonly SheetRow[]): Promise<Sent[]> => Promise.all(readyRows(rows).map(sendRow));

/** Confirm one row's write by its preview id; the answer is only what the response says. */
export async function sendRow(row: SheetRow): Promise<Sent> {
  if (!row.send.ok) return { id: row.id, answer: { status: 'failed', text: row.send.reason } };
  try {
    const r = await sendGapMr(row.send.intent, row.view);
    const o = r && outcomeOf(r, `gap ${row.id} · ${row.title}`);
    if (!o) return { id: row.id, answer: { status: 'failed', text: 'Nothing sent · the exact write is not on screen' } };
    const mr = r?.status === 'done' ? (mrOf(r.results) ?? undefined) : undefined;
    const view: WriteView | undefined = o.status === 'changed' ? { kind: 'preview', preview: o.preview } : o.status === 'refused' ? { kind: 'refused', reason: o.reason } : undefined;
    return { id: row.id, answer: { status: o.status, text: o.text, ...(mr ? { mr } : {}) }, ...(view ? { view } : {}) };
  } catch {
    return { id: row.id, answer: { status: 'failed', text: NO_ANSWER } };
  }
}

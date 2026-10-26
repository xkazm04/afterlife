// The probe stream as state: GET /api/start/probe sends one ProbeEvent per line (application/x-ndjson); each line folds
// into what the steps read, so a node lights on its own event long before `done`. Pure: the hook feeds it bytes.
import type { CapRow, NodeKey, NodeRead, ProbeEvent, TraceRead } from './types';

export interface ProbeState {
  stage: 'idle' | 'preflight' | 'rows' | 'done';
  /** Each node as its own event said; absent until it arrived. */
  nodes: Partial<Record<NodeKey, NodeRead>>;
  /** The doctor's rows as they settle. */
  caps: CapRow[];
  /** The whole read once `done` arrived. */
  read: TraceRead | null;
  refused: string | null;
}

export const PROBE_IDLE: ProbeState = { stage: 'idle', nodes: {}, caps: [], read: null, refused: null };

export function fold(s: ProbeState, e: ProbeEvent): ProbeState {
  switch (e.t) {
    case 'stage':
      return { ...s, stage: e.stage };
    case 'node':
      return { ...s, nodes: { ...s.nodes, [e.key]: e.read } };
    case 'cap':
      return { ...s, caps: [...s.caps.filter((c) => c.id !== e.row.id), e.row] };
    case 'done':
      return { ...s, stage: 'done', nodes: e.read.nodes, caps: e.read.caps ?? s.caps, read: e.read };
    case 'refused':
      return { ...s, stage: 'done', refused: e.reason };
  }
}

const T = new Set(['stage', 'node', 'cap', 'done', 'refused']);

/** One line as an event; a line that is not one is a refusal that says so, never skipped silently. */
export function eventOf(line: string): ProbeEvent {
  try {
    const v: unknown = JSON.parse(line);
    if (v && typeof v === 'object' && T.has((v as { t?: string }).t ?? '')) return v as ProbeEvent;
  } catch {
    /* falls through to the refusal */
  }
  return { t: 'refused', reason: `the probe stream sent a line that is not an event: ${line.slice(0, 80)}` };
}

/** Whole lines out of a buffer: the events, and the partial line left for the next chunk. */
export function splitLines(buffer: string): { events: ProbeEvent[]; rest: string } {
  const parts = buffer.split('\n');
  const rest = parts.pop() ?? '';
  return { events: parts.filter((l) => l.trim()).map(eventOf), rest };
}

// Reads GET /api/start/probe as it streams: each whole line becomes an event the moment it lands, so a step lights on
// its own event, not on the last one. An abort (a Re-check started another stream) ends it quietly; anything else that
// stops it early is a refusal in words, never a hang and never a silent stop.
import { splitLines } from '../model/stream';
import type { ProbeEvent } from '../model/types';

export async function readProbe(url: string, signal: AbortSignal, onEvent: (e: ProbeEvent) => void, get: typeof fetch = fetch): Promise<void> {
  let ended = false;
  const emit = (e: ProbeEvent) => {
    if (e.t === 'done' || e.t === 'refused') ended = true;
    onEvent(e);
  };
  try {
    const res = await get(url, { cache: 'no-store', signal });
    if (!res.ok || !res.body) return emit({ t: 'refused', reason: `the probe answered ${res.status}` });
    const reader = res.body.getReader();
    const text = new TextDecoder();
    let rest = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (signal.aborted) return;
      const got = splitLines(rest + (value ? text.decode(value, { stream: !done }) : ''));
      rest = got.rest;
      got.events.forEach(emit);
      if (done) break;
    }
    if (rest.trim()) splitLines(`${rest}\n`).events.forEach(emit);
    if (!ended) emit({ t: 'refused', reason: 'the probe stream ended before its last line' });
  } catch (e) {
    if (signal.aborted) return;
    emit({ t: 'refused', reason: `the server did not answer: ${e instanceof Error ? e.message : String(e)}` });
  }
}

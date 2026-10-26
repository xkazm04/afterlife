// The client's read of one screen stream: GET the NDJSON, hand each whole line to `onLine` as it arrives (a line torn
// across chunks waits for its end), resolve true once the `_end` line came. Never cached by the browser: the host
// decides what is stale. A non-2xx answer rejects with ScreenStreamError (its JSON `error`, else the status).
import { END, lineSplitter, toWireLine, type WireLine } from '../model/wire';

export class ScreenStreamError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function reasonOf(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') return body.error;
  } catch {
    // no JSON body: the status says enough
  }
  return `screen read: ${res.status}`;
}

/** Reads `url` to its end. Resolves false when the body ended without the `_end` line (a cut connection). */
export async function readStream(url: string, signal: AbortSignal, onLine: (line: WireLine) => void): Promise<boolean> {
  const res = await fetch(url, { cache: 'no-store', signal, headers: { accept: 'application/x-ndjson' } });
  if (!res.ok) throw new ScreenStreamError(res.status, await reasonOf(res));
  if (!res.body) throw new ScreenStreamError(res.status, 'screen read: no body');
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  const split = lineSplitter();
  let ended = false;
  const take = (texts: string[]) => {
    for (const text of texts) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        continue; // a line that is not JSON is dropped, never guessed at
      }
      const line = toWireLine(parsed);
      if (!line) continue;
      if (line.slice === END) ended = true;
      onLine(line);
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    take(split.feed(value));
  }
  take(split.flush());
  return ended;
}

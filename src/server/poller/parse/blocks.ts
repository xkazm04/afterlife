// Fenced blocks in MR notes and descriptions: ```belay-proof ... ```. The writers (gitlab/components/scripts/lib/lib.mjs
// `fence`) escape backticks inside the JSON, so the first closing fence ends the block. A block that is not valid JSON
// is ignored, never repaired. Both readers scan with indexOf, never a lazy regex: MR text is written by agents and
// people, and unclosed openers made the regex quadratic (13 to 18 s at 512 KB).

const FENCE = '```';

interface Fenced {
  /** Start of the opener. */
  from: number;
  /** Start of the body, just after the opener's line break. */
  body: number;
  /** End of the body: where the closing "\n```" begins (a "\r" before it is not body). */
  to: number;
  /** Just past the closing fence. */
  next: number;
}

/** Index just past the line break at `at` (LF or CRLF), or -1 when there is none there. */
function breakAfter(src: string, at: number): number {
  if (src[at] === '\n') return at + 1;
  return src[at] === '\r' && src[at + 1] === '\n' ? at + 2 : -1;
}

/** Each fenced block whose opener `headerEnd` accepts, in order; stops at the first opener with no closer, as none later can close. */
function* fenced(src: string, headerEnd: (from: number) => number): Generator<Fenced> {
  let at = 0;
  while ((at = src.indexOf(FENCE, at)) !== -1) {
    const body = headerEnd(at);
    if (body === -1) {
      at += 1;
      continue;
    }
    const end = src.indexOf('\n' + FENCE, body);
    if (end === -1) return;
    yield { from: at, body, to: src[end - 1] === '\r' && end > body ? end - 1 : end, next: end + 1 + FENCE.length };
    at = end + 1 + FENCE.length;
  }
}

/** Every parseable block with this tag, in order of appearance. `tag` is one of our own constants, never user text. */
export function extractBlocks(text: string, tag: string): unknown[] {
  const open = FENCE + tag;
  const out: unknown[] = [];
  for (const b of fenced(text, (from) => (text.startsWith(open, from) ? breakAfter(text, from + open.length) : -1))) {
    try {
      out.push(JSON.parse(text.slice(b.body, b.to)) as unknown);
    } catch {
      // malformed: skipped
    }
  }
  return out;
}

/** Text with every fenced block (any tag) removed. */
export function withoutBlocks(text: string): string {
  const lineEnd = /[\r\n]/g; // the opener's line end is found once per scan position, not once per opener
  let seen = -1;
  const headerEnd = (from: number): number => {
    if (seen < from + FENCE.length) {
      lineEnd.lastIndex = from + FENCE.length;
      const m = lineEnd.exec(text);
      seen = m ? m.index : text.length;
    }
    return seen < text.length ? breakAfter(text, seen) : -1;
  };
  let out = '';
  let kept = 0;
  for (const b of fenced(text, headerEnd)) {
    out += text.slice(kept, b.from);
    kept = b.next;
  }
  return out + text.slice(kept);
}

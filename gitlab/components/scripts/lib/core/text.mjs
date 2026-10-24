// Text rules shared by the CI glue: fenced JSON blocks, trailers, id shapes, and safe note text. Re-exported by ../lib.mjs.

/** JSON for a fenced block. A backtick can only sit inside a string, so ` keeps the value and kills any fence. */
export function fence(tag, value) {
  return '```' + tag + '\n' + JSON.stringify(value, null, 2).replaceAll('`', '\\u0060') + '\n```';
}

/** Every parseable fenced block with this tag in a text, in order. Linear: indexOf only, no lazy regex over hostile text. */
export function blocks(text, tag) {
  const src = String(text ?? '');
  const open = '```' + tag;
  const out = [];
  let at = 0;
  while ((at = src.indexOf(open, at)) !== -1) {
    const nl = src.startsWith('\r\n', at + open.length) ? at + open.length + 2 : src[at + open.length] === '\n' ? at + open.length + 1 : -1;
    if (nl === -1) {
      at += open.length;
      continue;
    }
    const end = src.indexOf('\n```', nl); // a missing closer here is missing for every later opener too
    if (end === -1) break;
    try {
      out.push(JSON.parse(src.slice(nl, src[end - 1] === '\r' && end > nl ? end - 1 : end)));
    } catch {
      /* a malformed block is ignored, never repaired */
    }
    at = end + 4;
  }
  return out;
}

/** Index just past the line break at `at` (LF or CRLF), or -1. */
const breakAfter = (src, at) => (src[at] === '\n' ? at + 1 : src[at] === '\r' && src[at + 1] === '\n' ? at + 2 : -1);

/** Text with every fenced block (any tag) removed: the poller's withoutBlocks (src/server/poller/parse/blocks.ts), same scan. */
export function withoutBlocks(text) {
  const src = String(text ?? '');
  let out = '';
  let kept = 0;
  let at = 0;
  let seen = -1; // the opener's line end is found once per scan position, not once per opener (hostile text stays linear)
  const nl = /[\r\n]/g;
  while ((at = src.indexOf('```', at)) !== -1) {
    if (seen < at + 3) {
      nl.lastIndex = at + 3;
      const m = nl.exec(src);
      seen = m ? m.index : src.length;
    }
    const body = seen < src.length ? breakAfter(src, seen) : -1;
    if (body === -1) {
      at += 1;
      continue;
    }
    const end = src.indexOf('\n```', body);
    if (end === -1) break;
    out += src.slice(kept, at);
    kept = end + 4;
    at = kept;
  }
  return out + src.slice(kept);
}

/** Last `Key: value` trailer line in a text outside any fenced block (as the poller reads it), or null. The value must match `shape`. */
export function trailer(text, key, shape = /^\S+$/) {
  const re = new RegExp(`^${key}:[ \\t]*(.+?)[ \\t]*$`, 'gmi');
  let found = null;
  for (const m of withoutBlocks(text).matchAll(re)) if (shape.test(m[1])) found = m[1];
  return found;
}

export const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
export const CLASS_ID = /^[a-z][a-z0-9.-]*$/;

/** Keeps a reason from pinging people or breaking out of the note. */
export function plain(s) {
  return String(s).replaceAll('`', "'").replaceAll('@', '@​').replace(/\s+/g, ' ').slice(0, 300);
}

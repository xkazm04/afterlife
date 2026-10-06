// Fenced blocks in MR notes and descriptions: ```belay-proof ... ```. The writers (gitlab/components/scripts/lib/lib.mjs
// `fence`) escape backticks inside the JSON, so the first closing fence ends the block. A block that is not valid JSON
// is ignored, never repaired.

/** Every parseable block with this tag, in order of appearance. `tag` is one of our own constants, never user text. */
export function extractBlocks(text: string, tag: string): unknown[] {
  const re = new RegExp('```' + tag + '\\r?\\n([\\s\\S]*?)\\r?\\n```', 'g');
  const out: unknown[] = [];
  for (const m of text.matchAll(re)) {
    try {
      out.push(JSON.parse(m[1] ?? '') as unknown);
    } catch {
      // malformed: skipped
    }
  }
  return out;
}

/** Text with every fenced block removed. */
export const withoutBlocks = (text: string): string => text.replace(/```[^\r\n]*\r?\n[\s\S]*?\r?\n```/g, '');

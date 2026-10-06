// Trailers on MR descriptions and notes: `Belay-Task: <id>`, `Belay-Class: <class>`, `Belay-Finding: <id>`
// (gitlab/components/README.md). The last matching line wins, as in the CI glue.
import { withoutBlocks } from './blocks';

/** A task id: a ULID (26 characters, Crockford base32). The seeded demo uses 6-character ids, so 6..26 are accepted. */
export const TASK_ID = /^[0-9A-HJKMNP-TV-Z]{6,26}$/;
export const CLASS_ID = /^[a-z][a-z0-9.-]*$/;
const FINDING_ID = /^\S{1,64}$/;

export interface BelayTrailers {
  task: string | null;
  class: string | null;
  finding: string | null;
}

/** The last `Key: value` line whose value has the right shape, or null. A trailer inside a fenced block does not count. */
export function lastTrailer(text: string, key: string, shape: RegExp): string | null {
  const re = new RegExp(`^${key}:[ \\t]*(.+?)[ \\t]*$`, 'gmi');
  let found: string | null = null;
  for (const m of withoutBlocks(text).matchAll(re)) {
    const v = m[1] ?? '';
    if (shape.test(v)) found = v;
  }
  return found;
}

export const parseTrailers = (text: string): BelayTrailers => ({
  task: lastTrailer(text, 'Belay-Task', TASK_ID),
  class: lastTrailer(text, 'Belay-Class', CLASS_ID),
  finding: lastTrailer(text, 'Belay-Finding', FINDING_ID),
});

/** The human-readable part of a description: no fenced blocks, no Belay trailers. This is the agent's own words. */
export function proseOf(text: string): string {
  return withoutBlocks(text)
    .split(/\r?\n/)
    .filter((l) => !/^Belay-(Task|Class|Finding):/i.test(l.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

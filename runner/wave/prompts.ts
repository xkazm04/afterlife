// The prompts (runner/prompts/{plan,lane,reflect,review,repair,frontier}.md) and their version: first 12 hex of
// sha256 over the concatenated files in that order, a missing file counting as the empty string. A missing file
// also falls back to a minimal inline prompt so the runner still runs - `fallback` says which, and the README
// documents it.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type PromptName = 'plan' | 'lane' | 'reflect' | 'review' | 'repair' | 'frontier';
/** Hash order: the first three are the original set, so their order is kept; the rest are appended. */
const NAMES: PromptName[] = ['plan', 'lane', 'reflect', 'review', 'repair', 'frontier'];

const FALLBACK: Record<PromptName, string> = {
  plan: 'You are a read-only planner. Read the repo, then reply with ONLY JSON lines, one lane each, shaped {"lane":"<kebab id>","title":"<imperative>","files":["<path>"],"why":"<file:line>","challenge":"<text>"}.',
  lane: 'You are a headless lane in a worktree. Do the one item you are given; do not commit. End with ONE plain line: "DONE: <what changed>" or "PARK: <reason>".',
  reflect: 'Given this wave\'s belay.run/0 events, propose at most one prompt edit (a diff) that would land more lanes per dollar, or say nothing needs changing.',
  review: 'You are a read-only reviewer of one lane\'s change (below). Find defects the gates will report or rules the change breaks. End with ONE ```json block: {"v":1,"findings":[{"file","line","check","problem","evidence"}]}; an empty list means OK.',
  repair: 'A reviewer found the defects below in your change. Fix each in place, touch nothing else, then end with ONE plain line: "DONE: <what changed>" or "PARK: <reason>".',
  frontier: 'Choose ONE real improvement toward the objective below and name its mechanism. Drop anything that needs network, a new dependency, CI, .claude/ or an existing test. End with ONE plain line: "DONE: <what changed>" or "PARK: <reason>".',
};

export interface Prompts {
  text: Record<PromptName, string>;
  version: string;
  /** Names that came from the inline fallback because runner/prompts/<name>.md is absent. */
  fallback: PromptName[];
}

export function loadPrompts(dir = fileURLToPath(new URL('../prompts', import.meta.url))): Prompts {
  const text = {} as Record<PromptName, string>;
  const fallback: PromptName[] = [];
  const hash = createHash('sha256');
  for (const n of NAMES) {
    let body = '';
    try {
      body = fs.readFileSync(path.join(dir, `${n}.md`), 'utf8');
    } catch {
      /* absent: hashed as empty */
    }
    hash.update(body);
    if (body) text[n] = body;
    else {
      text[n] = FALLBACK[n];
      fallback.push(n);
    }
  }
  return { text, version: hash.digest('hex').slice(0, 12), fallback };
}

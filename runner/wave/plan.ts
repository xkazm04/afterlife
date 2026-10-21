// The plan step's two pure halves: the prompt it is given and the JSON lines it must answer in. A line that
// does not parse is dropped (the plan prompt says so); a plan with no readable line runs nothing.
import type { FleetRepo } from '../index';

export interface PlanItem {
  lane: string;
  title: string;
  files: string[];
  why: string;
  challenge: string;
}

/** The step marker is for tooling (and the test fake): every prompt the runner sends carries one. */
export const stepMarker = (step: string, lane = ''): string => `\n<!-- belay:step=${step}${lane ? ` lane=${lane}` : ''} -->`;

export function planPrompt(base: string, repo: FleetRepo, lanes: number, history: readonly string[] = [], baseRef?: string): string {
  const done = history.length
    ? `\n## Earlier waves on this repo (do not re-plan a landed item; a parked or failed one only with a new approach)\n${history.map((h) => `- ${h}`).join('\n')}\n`
    : '';
  return `${base}\n\n## This wave\n- repo: ${repo.slug}\n- base: ${baseRef ?? repo.base}\n- plan exactly ${lanes} lane(s), fewer only if fewer real items exist (then just emit fewer lines)\n- gates every lane must pass:\n${repo.gates.map((g) => `  - ${g}`).join('\n')}\n${done}${stepMarker('plan')}`;
}

/** What a lane is checked by: the repo's gates (run by the runner after it) and the Bash prefixes it may run itself. */
export interface LaneChecks {
  gates: readonly string[];
  commands: readonly string[];
}

export function lanePrompt(base: string, item: PlanItem, capUsd: number, checks: LaneChecks): string {
  const gates = checks.gates.map((g) => `  - ${g}`).join('\n');
  const commands = checks.commands.length ? checks.commands.map((c) => `  - ${c} ...`).join('\n') : '  - (none: you cannot run a shell check; say so and end with DONE)';
  return `${base}\n\n## Your item\n- lane: ${item.lane}\n- title: ${item.title}\n- files: ${item.files.join(', ') || '(none named)'}\n- why: ${item.why}\n- challenge: ${item.challenge}\n- dollar cap for this session: $${capUsd}\n\n## Checks\n- gates the runner runs after you; every one must be green or nothing commits:\n${gates}\n- shell commands you may run (each line is a prefix; any other command is denied):\n${commands}\n- before DONE, run the cheap ones: the formatter, the tests of the files you touched, the typecheck. Never a full suite that takes minutes.\n${stepMarker('lane', item.lane)}`;
}

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);

/** Lines of the planner's answer that look like a JSON object: what it tried to plan, parsed or not. */
/** The plan's JSON lines that could be lanes: the `{"empty":[...]}` note is not one, so it is not counted. */
export const jsonLines = (text: string): number => text.split(/\r?\n/).filter((l) => l.trim().startsWith('{') && !/^\{\s*"empty"\s*:/.test(l.trim())).length;

/** The planner's `{"empty":[...]}` line: the axes it searched and found nothing on (plan.md's output contract). */
export function parseEmptyAxes(text: string): string[] {
  for (const line of text.split(/\r?\n/).reverse()) {
    const t = line.trim();
    if (!t.startsWith('{') || !t.includes('"empty"')) continue;
    try {
      const o = JSON.parse(t) as { empty?: unknown };
      if (Array.isArray(o.empty)) return o.empty.filter((s): s is string => typeof s === 'string').map((s) => s.slice(0, 600)).slice(0, 12);
    } catch {
      /* not the note */
    }
  }
  return [];
}

export function parsePlan(text: string, max: number): PlanItem[] {
  const items: PlanItem[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith('{')) continue;
    let o: Record<string, unknown>;
    try {
      o = JSON.parse(t) as Record<string, unknown>;
    } catch {
      continue;
    }
    const lane = typeof o.lane === 'string' ? slug(o.lane) : '';
    if (!lane || seen.has(lane) || typeof o.title !== 'string' || !o.title.trim()) continue;
    seen.add(lane);
    const why = typeof o.why === 'string' ? o.why : '';
    // plan.md's cap, enforced: at most AXIS_CAP lanes per `[axis]` a why starts with (an untagged why is not capped).
    const axis = axisOf(why);
    if (axis && items.filter((i) => axisOf(i.why) === axis).length >= AXIS_CAP) continue;
    items.push({
      lane,
      title: o.title.trim(),
      files: Array.isArray(o.files) ? o.files.filter((f): f is string => typeof f === 'string').slice(0, 40) : [],
      why,
      challenge: typeof o.challenge === 'string' ? o.challenge : '',
    });
    if (items.length >= max) break;
  }
  return items;
}

/** Lanes of one wave on one craft axis (plan.md says the same). */
export const AXIS_CAP = 2;

/** The `[axis]` a plan item's why starts with, lower-cased, or '' when it has none. */
export const axisOf = (why: string): string => /^\s*\[([a-z][a-z-]*)\]/i.exec(why)?.[1]?.toLowerCase() ?? '';

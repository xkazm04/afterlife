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

export function planPrompt(base: string, repo: FleetRepo, lanes: number): string {
  return `${base}\n\n## This wave\n- repo: ${repo.slug}\n- base: ${repo.base}\n- plan at most ${lanes} lane(s)\n- gates every lane must pass:\n${repo.gates.map((g) => `  - ${g}`).join('\n')}\n${stepMarker('plan')}`;
}

export function lanePrompt(base: string, item: PlanItem, capUsd: number): string {
  return `${base}\n\n## Your item\n- lane: ${item.lane}\n- title: ${item.title}\n- files: ${item.files.join(', ') || '(none named)'}\n- why: ${item.why}\n- challenge: ${item.challenge}\n- dollar cap for this session: $${capUsd}\n${stepMarker('lane', item.lane)}`;
}

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);

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
    items.push({
      lane,
      title: o.title.trim(),
      files: Array.isArray(o.files) ? o.files.filter((f): f is string => typeof f === 'string').slice(0, 40) : [],
      why: typeof o.why === 'string' ? o.why : '',
      challenge: typeof o.challenge === 'string' ? o.challenge : '',
    });
    if (items.length >= max) break;
  }
  return items;
}

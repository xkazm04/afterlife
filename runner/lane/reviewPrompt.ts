// The review and repair turns' two texts and the review's contract, pure so a test pins them. Ported from Ascent's
// lane-review.ts (archive ref refs/hygiene-archive/2026-10-20/experiment/infinite-cycles, cycles personas-web-006
// and -007): the reviewer reads the lane's change in a FRESH read-only session and answers in one json block; only
// when it cites findings (or the runner put an existing test back) does the lane get ONE repair turn with them.
// Afterlife's lanes can run their own checks, so the reviewer's brief adds a SCOPE check against the item and lane.md.
import type { PlanItem } from '../wave/plan';
import { stepMarker } from '../wave/plan';

/** At most this many findings reach the repair turn, most certain first (the reviewer's order). */
export const MAX_FINDINGS = 8;
/** The diff the review prompt carries; past it, the reviewer reads the files itself. */
export const DIFF_BUDGET_CHARS = 40_000;

/** One defect the reviewer says a gate or a rule WILL reject, with what proves it. */
export interface ReviewFinding {
  file: string;
  line: number | null;
  /** compile, test, spec, lint, scope - or `integrity` for a file the runner put back. */
  check: string;
  problem: string;
  evidence: string;
}

/** What the reviewer is shown: the changed paths and the lane's diff against its base, bounded. */
export interface ChangeView {
  changed: { status: 'added' | 'modified' | 'deleted'; path: string }[];
  diff: string;
}

const fence = (text: string): string => {
  const ticks = /```/.test(text) ? '~~~~' : '```';
  return `${ticks}\n${text}\n${ticks}`;
};

/** The diff cut to its budget, saying so when it was cut. */
export const capDiff = (diff: string, max = DIFF_BUDGET_CHARS): string => (diff.length > max ? `${diff.slice(0, max)}\n... (diff cut short at ${max} characters; Read the files for the rest)` : diff);

export interface ReviewPromptInput {
  base: string;
  item: PlanItem;
  /** lane.md as the lane ran it: the rules the change is reviewed against. */
  laneRules: string;
  gates: readonly string[];
  view: ChangeView;
  /** Existing test files the runner put back to base before this review. */
  restored: readonly string[];
}

export function reviewPrompt(i: ReviewPromptInput): string {
  const lines = [
    i.base.trimEnd(),
    '',
    '## This lane',
    `- lane: ${i.item.lane}`,
    `- title: ${i.item.title}`,
    `- why: ${i.item.why || '(none)'}`,
    `- challenge: ${i.item.challenge || '(none)'}`,
    `- files the plan named: ${i.item.files.join(', ') || '(none named)'}`,
    '- gates that run after the repair turn:',
    ...i.gates.map((g) => `  - ${g}`),
    '',
    '## The change',
    ...i.view.changed.map((c) => `- ${c.status}: ${c.path}`),
    '',
  ];
  if (i.restored.length) {
    lines.push(
      '### Put back by the runner before this review',
      ...i.restored.map((p) => `- ${p}: an EXISTING test file or fixture the lane changed beyond a mechanical call-site update. It is back at its base text and is not in the diff below. It still runs: under check 3, read it and confirm it still passes against the change.`),
      '',
    );
  }
  lines.push('### Diff against the lane\'s base', i.view.diff ? fence(i.view.diff) : '(empty)', '', "## The lane's brief, as it ran (the rules the change keeps)", i.laneRules.trim());
  return `${lines.join('\n')}\n${stepMarker('review', i.item.lane)}`;
}

/** A file the runner put back, as the repair turn's first findings. */
export const integrityFinding = (file: string): ReviewFinding => ({
  file,
  line: null,
  check: 'integrity',
  problem: 'an EXISTING test file or fixture that your change edited beyond a mechanical call-site update; that voids the lane, so the runner has put it back to its text at your base',
  evidence: "lane.md: modifying an existing test file voids the lane (the one exception is a mechanical call-site update)",
});

export function repairPrompt(base: string, lane: string, findings: readonly ReviewFinding[]): string {
  const list = findings.map((f, n) => `${n + 1}. ${f.file}${f.line != null ? `:${f.line}` : ''} [${f.check}] ${f.problem}${f.evidence ? ` (evidence: ${f.evidence})` : ''}`);
  return `${base.trimEnd()}\n\nFindings:\n${list.join('\n')}\n${stepMarker('repair', lane)}`;
}

/** The LAST fenced json block's findings ([] = OK), or null when there is no readable contract block. */
export function parseReview(text: string): ReviewFinding[] | null {
  const blocks = [...text.matchAll(/```json[^\n]*\n([\s\S]*?)\n```/g)];
  const last = blocks.length ? blocks[blocks.length - 1]?.[1] : undefined;
  if (last == null) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(last);
  } catch {
    return null;
  }
  const list = raw && typeof raw === 'object' ? (raw as { findings?: unknown }).findings : undefined;
  if (!Array.isArray(list)) return null;
  const out: ReviewFinding[] = [];
  for (const f of list) {
    if (!f || typeof f !== 'object') continue;
    const o = f as Record<string, unknown>;
    if (typeof o.file !== 'string' || !o.file.trim() || typeof o.problem !== 'string' || !o.problem.trim()) continue;
    out.push({
      file: o.file.trim(),
      line: typeof o.line === 'number' && Number.isInteger(o.line) && o.line > 0 ? o.line : null,
      check: typeof o.check === 'string' && o.check.trim() ? o.check.trim().slice(0, 20) : 'other',
      problem: o.problem.trim().slice(0, 600),
      evidence: typeof o.evidence === 'string' ? o.evidence.trim().slice(0, 400) : '',
    });
    if (out.length >= MAX_FINDINGS) break;
  }
  return out;
}

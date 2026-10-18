// Why a task has the verdict it has: the terms that decided it, in check order. Pure: the screen opens on the first one,
// writes it into the URL and walks them with n.
import type { TaskView } from '../types';
import type { Selection } from '../court/selection';
import { derivedVerdict, isStruck } from './verdict';

/**
 * One deciding term. A check fails the verdict (or, `undetermined`, leaves it open); `envelope: 'breach'` is the diff
 * leaving its envelope. `alone`: setting this one term right by itself would change the verdict.
 * Declared here, not in model/types.ts: only this module and the equation read it.
 */
export type VerdictReason = { check: string; alone: boolean; undetermined?: true } | { envelope: 'breach'; alone: boolean };

type Task = Pick<TaskView, 'id' | 'proof' | 'envelope' | 'claims'>;

/** The verdict with one term set right: a check passes, or the envelope holds. */
const verdictWithout = (task: Task, term: { check: string } | { envelope: 'breach' }) =>
  'check' in term
    ? derivedVerdict({ ...task, proof: { ...task.proof, checks: task.proof.checks.map((c) => (c.id === term.check ? { ...c, ok: true } : c)) } }).verdict
    : derivedVerdict({ ...task, envelope: task.envelope && { ...task.envelope, within: true } }).verdict;

/**
 * The terms that decided a FAIL (the failing engine checks, then an envelope breach) or an INCONCLUSIVE (the undetermined
 * engine checks). A PASS or UNKNOWN has none, and a struck term (a person decides it) is never a reason.
 */
export function verdictReasons(task: Task): VerdictReason[] {
  const { verdict } = derivedVerdict(task);
  if (verdict !== 'FAIL' && verdict !== 'INCONCLUSIVE') return [];
  const want = verdict === 'FAIL' ? false : null;
  const terms: ({ check: string } | { envelope: 'breach' })[] = task.proof.checks.filter((c) => !isStruck(c) && c.ok === want).map((c) => ({ check: c.id }));
  if (verdict === 'FAIL' && task.envelope?.within === false) terms.push({ envelope: 'breach' });
  return terms.map((t) => ({ ...t, alone: verdictWithout(task, t) !== verdict, ...(want === null ? { undetermined: true as const } : {}) }));
}

/** The checks among the reasons, as selections: what the screen can open on and n can step to. */
const reasonSelections = (task: Task): Selection[] =>
  verdictReasons(task).flatMap((r) => ('check' in r ? [{ side: 'check' as const, id: r.check }] : []));

/** What the task opens on: its first deciding check, or nothing (a PASS opens with nothing selected). */
export const openingSelection = (task: Task): Selection => reasonSelections(task)[0] ?? null;

export interface SelectionQuery {
  check?: string | string[];
  claim?: string | string[];
}

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/** The selection a URL asks for (?check= or ?claim=), when the task holds that id; otherwise the opening selection. */
export function selectionFromQuery(task: Task, q: SelectionQuery): Selection {
  const check = first(q.check);
  if (check && task.proof.checks.some((c) => c.id === check)) return { side: 'check', id: check };
  const claim = first(q.claim);
  if (claim && task.claims.some((c) => c.id === claim)) return { side: 'claim', id: claim };
  return openingSelection(task);
}

/** The address of a selection on a task: /task/<id>?check=<id>, ?claim=<id>, or the bare task. */
export const selectionHref = (taskId: string, sel: Selection): string =>
  `/task/${taskId}${sel ? `?${sel.side}=${encodeURIComponent(sel.id)}` : ''}`;

/**
 * The next deciding check after the current one: the next in this task, then the first of the next visible task that has
 * one, wrapping round to this task. A selection that is not a reason starts at this task's first. Null when no visible
 * task has a reason.
 */
export function nextReason(visible: readonly Task[], currentId: string, sel: Selection): { id: string; sel: Selection } | null {
  const at = visible.findIndex((t) => t.id === currentId);
  const here = at >= 0 ? visible[at] : undefined;
  if (here) {
    const own = reasonSelections(here);
    const i = sel ? own.findIndex((s) => s?.side === sel.side && s.id === sel.id) : -1;
    const next = own[i + 1];
    if (next) return { id: here.id, sel: next };
  }
  for (let step = 1; step <= visible.length; step += 1) {
    const t = visible[(at + step) % visible.length];
    const open = t && openingSelection(t);
    if (t && open) return { id: t.id, sel: open };
  }
  return null;
}

/** "FAIL because envelope · envelope breached", "… · stored PASS" when the stored word disagrees; null for no reason. */
export function becauseLine(task: Task): string | null {
  const reasons = verdictReasons(task);
  if (!reasons.length) return null;
  const d = derivedVerdict(task);
  const checks = reasons.flatMap((r) => ('check' in r ? [r.check] : []));
  const breach = reasons.some((r) => 'envelope' in r);
  const parts = [
    checks.length ? `${checks.join(', ')}${d.verdict === 'INCONCLUSIVE' ? ' undetermined' : ''}` : '',
    breach ? 'envelope breached' : '',
    d.mismatch ? `stored ${d.stored}` : '',
  ].filter(Boolean);
  return `${d.verdict} because ${parts.join(' · ')}`;
}

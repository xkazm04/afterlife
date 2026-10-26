// Why a task has the verdict it has: the terms that decided it, in check order. Pure: the screen opens on the first one,
// writes it into the URL and walks them with n.
import type { TaskView } from '../types';
import type { Selection } from '../court/selection';
import { firstParam } from '@/lib/url/searchParams';
import { TAB_KEY } from '../tab';
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

/** The selection a URL asks for (?check= or ?claim=), when the task holds that id; otherwise the opening selection. */
export function selectionFromQuery(task: Task, q: SelectionQuery): Selection {
  const check = firstParam(q.check);
  if (check && task.proof.checks.some((c) => c.id === check)) return { side: 'check', id: check };
  const claim = firstParam(q.claim);
  if (claim && task.claims.some((c) => c.id === claim)) return { side: 'claim', id: claim };
  return openingSelection(task);
}

/** The address of a selection on a task: /task/<id>?check=<id>, ?claim=<id>, or the bare task. The id is one encoded segment. */
export const selectionHref = (taskId: string, sel: Selection): string =>
  `/task/${encodeURIComponent(taskId)}${sel ? `?${sel.side}=${encodeURIComponent(sel.id)}` : ''}`;

/** The query keys the task owns: the selection's and the open tab's. A stale one in `search` is dropped, never carried. */
const OWN_KEYS: ReadonlySet<string> = new Set(['check', 'claim', TAB_KEY]);

/** A task address (selection and tab) plus every query key of `search` the task does not own. */
export function keepForeignKeys(href: string, search: string): string {
  const [path = '', own = ''] = href.split('?');
  const q = new URLSearchParams(own);
  for (const [k, v] of new URLSearchParams(search)) if (!OWN_KEYS.has(k) && !q.has(k)) q.append(k, v);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

/**
 * The next deciding check after the current one: the next in this task (`here`, the open task whole), then the opening
 * check of the next visible docket row that has one, wrapping round to this task. A selection that is not a reason starts
 * at this task's first. Null when no visible task has a reason. The docket rows carry each task's opening check, so the
 * other tasks need not be held whole.
 */
export function nextReason(visible: readonly { id: string; opening?: Selection }[], here: Task, sel: Selection): { id: string; sel: Selection } | null {
  const at = visible.findIndex((t) => t.id === here.id);
  if (at >= 0) {
    const own = reasonSelections(here);
    const i = sel ? own.findIndex((s) => s?.side === sel.side && s.id === sel.id) : -1;
    const next = own[i + 1];
    if (next) return { id: here.id, sel: next };
  }
  for (let step = 1; step <= visible.length; step += 1) {
    const t = visible[(at + step) % visible.length];
    const open = t && (t.id === here.id ? openingSelection(here) : t.opening);
    if (t && open) return { id: t.id, sel: open };
  }
  return null;
}

/** The selection and tab query of a URL (the screen's `search`), as the route's searchParams once read them. */
export const queryOf = (search: URLSearchParams): SelectionQuery & { tab?: string } => {
  const q: SelectionQuery & { tab?: string } = {};
  for (const k of ['check', 'claim', TAB_KEY] as const) {
    const v = search.get(k);
    if (v !== null) q[k] = v;
  }
  return q;
};

/**
 * "FAIL because envelope · envelope breached", "… · stored PASS" when the stored word disagrees; null for a PASS or UNKNOWN.
 * An INCONCLUSIVE with no reason has no engine check left (none held, or every one struck): it says so.
 */
export function becauseLine(task: Task): string | null {
  const reasons = verdictReasons(task);
  const d = derivedVerdict(task);
  if (!reasons.length && d.verdict !== 'INCONCLUSIVE') return null;
  const checks = reasons.flatMap((r) => ('check' in r ? [r.check] : []));
  const breach = reasons.some((r) => 'envelope' in r);
  const parts = [
    !reasons.length ? 'no engine check' : '',
    checks.length ? `${checks.join(', ')}${d.verdict === 'INCONCLUSIVE' ? ' undetermined' : ''}` : '',
    breach ? 'envelope breached' : '',
    d.mismatch ? `stored ${d.stored}` : '',
  ].filter(Boolean);
  return `${d.verdict} because ${parts.join(' · ')}`;
}

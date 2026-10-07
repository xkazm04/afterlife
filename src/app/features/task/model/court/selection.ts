import type { TaskView } from '../types';

export type Side = 'check' | 'claim';
export type Selection = { side: Side; id: string } | null;
export type Emphasis = 'sel' | 'rel' | 'dim' | 'none';
export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

export const isSelected = (sel: Selection, side: Side, id: string): boolean => sel?.side === side && sel.id === id;

/** Clicking the selected card clears it; clicking another selects it. */
export const toggleSelection = (sel: Selection, side: Side, id: string): Selection => (isSelected(sel, side, id) ? null : { side, id });

/** Ids on the other side that tie to the selection. */
export function relatedIds(task: TaskView, sel: Selection): { checks: string[]; claims: string[] } {
  if (!sel) return { checks: [], claims: [] };
  if (sel.side === 'claim') return { checks: task.claims.find((c) => c.id === sel.id)?.checks ?? [], claims: [] };
  return { checks: [], claims: task.proof.checks.find((c) => c.id === sel.id)?.claims ?? [] };
}

/** How a card is drawn while something is selected: itself, tied to it, or dimmed. */
export function emphasis(task: TaskView, sel: Selection, side: Side, id: string): Emphasis {
  if (!sel) return 'none';
  if (isSelected(sel, side, id)) return 'sel';
  const rel = relatedIds(task, sel);
  return (side === 'check' ? rel.checks : rel.claims).includes(id) ? 'rel' : 'dim';
}

/** The chain link the selected check's evidence comes from, or -1. */
export function litLink(task: TaskView, sel: Selection): number {
  if (sel?.side !== 'check') return -1;
  return task.proof.checks.find((c) => c.id === sel.id)?.link ?? -1;
}

/** "link 3 · Act" for a check's evidence link, or "link unknown" when the task has no receipt chain to point into. */
export function linkLabel(task: TaskView, link: number): string {
  const l = task.chain[link];
  return l ? `link ${link + 1} · ${l.step}` : 'link unknown';
}

/** One arrow press. Up/down walk the column; left/right cross to the other column along a tie. No selection: first check. */
export function arrowSelection(task: TaskView, sel: Selection, key: ArrowKey): Selection {
  const first = task.proof.checks[0];
  if (!sel) return first ? { side: 'check', id: first.id } : null;
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const to: Side = key === 'ArrowLeft' ? 'claim' : 'check';
    if (to === sel.side) return sel;
    const id =
      sel.side === 'check'
        ? (task.proof.checks.find((c) => c.id === sel.id)?.claims[0] ?? task.claims[0]?.id)
        : (task.claims.find((c) => c.id === sel.id)?.checks[0] ?? first?.id);
    return id ? { side: to, id } : sel;
  }
  const ids = sel.side === 'check' ? task.proof.checks.map((c) => c.id) : task.claims.map((c) => c.id);
  const at = ids.indexOf(sel.id);
  const next = ids[(at + (key === 'ArrowDown' ? 1 : -1) + ids.length) % ids.length];
  return next ? { side: sel.side, id: next } : sel;
}

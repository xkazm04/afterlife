// Where Esc leads from the film. Arriving from the front door (its links carry ?from=door), Esc goes back to the door,
// like the breadcrumb; from anywhere else it enters the app, like "Enter Afterlife". Pure.

export type LeaveHref = '/' | '/fleet';

/** Esc's destination for the page's `from` search param (null when absent). */
export function leaveHref(from: string | null): LeaveHref {
  return from === 'door' ? '/' : '/fleet';
}

/** The words the timeline's key hint gives Esc, for where it leads. */
export const leaveWords = (out: LeaveHref): string => (out === '/' ? 'Esc back to the door' : 'Esc enters Afterlife');

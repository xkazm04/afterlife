// The words of the loop: phase names, what each phase says for a cycle, verdict labels. Pure.
import { summarize } from './replay';
import type { Cycle, Phase, Verdict } from './types';

export const PHASE_WORD: Record<Phase, string> = {
  scan: 'Scan',
  pick: 'Pick',
  send: 'Send',
  merge: 'Merge',
  prove: 'Prove',
  credit: 'Credit',
};

/** What a phase is, in one line, for the rail's tooltip. */
export const PHASE_MEANS: Record<Phase, string> = {
  scan: 'The engine scans every stage; the cycle starts from what it finds',
  pick: 'You pick the gaps worth closing; the autopilot only proposes',
  send: 'Send as you: Afterlife opens one MR per gap with your glab login, after showing the exact commands',
  merge: 'A person merges each MR in GitLab; Afterlife holds no merge token',
  prove: 'The new jobs must run on the default branch and leave evidence',
  credit: 'The rescan credits a rung only when every check holds (same engine); then the cycle closes',
};

/** The one-line detail under each phase of the rail. */
export function phaseDetail(c: Cycle, p: Phase): string {
  const s = summarize(c);
  const n = c.changes.length;
  if (c.state === 'planned') {
    return { scan: `day ${c.openedDay}`, pick: `${n} proposed`, send: '—', merge: '—', prove: '—', credit: '—' }[p];
  }
  if (c.state === 'running') {
    return { scan: `day ${c.openedDay}`, pick: `${n} picked`, send: `${n} wait for you`, merge: '—', prove: '—', credit: '—' }[p];
  }
  return {
    scan: `day ${c.openedDay}`,
    pick: `${n} change${n === 1 ? '' : 's'}`,
    send: `${s.sent} MR${s.sent === 1 ? '' : 's'}`,
    merge: `${s.sent} merged`,
    prove: proveDetail(c),
    credit: `${s.net >= 0 ? '+' : ''}${s.net} · day ${c.closedDay}`,
  }[p];
}

/** What the Prove phase found: changes that left no evidence, drift, or evidence on main for everything. */
function proveDetail(c: Cycle): string {
  const bare = c.changes.filter((x) => x.verdict === 'nolift').length;
  const drift = c.changes.filter((x) => x.verdict === 'regressed').length;
  const parts = [bare ? `${bare} not exercised` : '', drift ? `${drift} drift found` : ''].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'evidence on main';
}

export const VERDICT_WORD: Record<Verdict, string> = {
  credited: 'credited',
  nolift: 'no lift',
  rejected: 'rejected',
  resolved: 'resolved',
  regressed: 'regressed',
  pending: 'picked',
  planned: 'planned',
};

/** The chip tone for a verdict (kit Chip tones). */
export const VERDICT_TONE = {
  credited: 'ok',
  nolift: 'neutral',
  rejected: 'bad',
  resolved: 'accent',
  regressed: 'bad',
  pending: 'you',
  planned: 'unknown',
} as const satisfies Record<Verdict, string>;

export const STATE_WORD = { closed: 'closed', running: 'running', planned: 'planned' } as const;

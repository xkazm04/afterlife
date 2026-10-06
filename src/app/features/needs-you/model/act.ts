// Every button on the screen is an ActionId. Staging puts the exact write in the outbox and sends nothing;
// Retire, Not yet and the runner check are the only actions that skip it.
import { CRA } from '../data/cra';
import { READMIT } from '../data/readmit';
import { RUNNER } from '../data/runner';
import type { NeedsYouDemo } from '../data/types';
import { buildOutItem, stageItem, unstageItem } from './outbox/outbox';
import { decided } from './rows/history';
import { ranToast } from './run';
import { notify, revealSection } from './state';
import type { ActionId, DecisionKey, NeedsState } from './types';

/** Gaps that are ticked and not yet staged. */
export const pickedGaps = (s: NeedsState, demo: NeedsYouDemo) => demo.gaps.filter((g) => s.gaps[g.id] && !s.gapStatus[g.id]);

function stage(s: NeedsState, key: string, demo: NeedsYouDemo): NeedsState {
  const item = buildOutItem(key, demo);
  return item ? { ...s, out: stageItem(s.out, item), outboxOpen: true } : s;
}
const setStatus = (s: NeedsState, key: DecisionKey, v: NeedsState['status'][DecisionKey]): NeedsState => ({ ...s, status: { ...s.status, [key]: v } });

/** Take a staged write back (or remove it): the decision is open again and nothing was sent. */
export function unstage(s: NeedsState, key: string, text: string): NeedsState {
  const out = unstageItem(s.out, key);
  if (key.startsWith('g')) {
    const gapStatus = Object.fromEntries(Object.entries(s.gapStatus).filter(([k]) => k !== key));
    return notify({ ...s, out, gapStatus }, 'status', text);
  }
  return notify({ ...setStatus(s, key as DecisionKey, 'open'), out }, 'status', text);
}

export function act(s: NeedsState, action: ActionId, demo: NeedsYouDemo): NeedsState {
  const [verb = '', arg = ''] = action.split(':');
  switch (verb) {
    case 'read-draft':
      return revealSection({ ...s, read: { ...s.read, draft: true }, sel: 'n2' }, 'n2-draft');
    case 'read-note':
      return revealSection({ ...s, read: { ...s.read, note: true }, sel: 'n4' }, 'n4-note');
    case 'stage-n2':
      return s.read.draft ? notify(stage(setStatus(s, 'n2', 'staged'), 'n2', demo), 'status', 'Staged · first in line in the outbox. Not sent.') : s;
    case 'stage-n1':
      return notify(stage(setStatus(s, 'n1', 'staged'), 'n1', demo), 'status', 'Policy MR staged. The tier is unchanged.');
    case 'stage-n4':
      return s.read.note ? notify(stage(setStatus(s, 'n4', 'staged'), 'n4', demo), 'status', 'Re-admission MR staged. Still quarantined.') : s;
    case 'stage-gap': {
      const g = demo.gaps.find((x) => x.id === arg);
      if (!g) return s;
      const next = { ...s, gaps: { ...s.gaps, [arg]: true }, gapStatus: { ...s.gapStatus, [arg]: 'staged' as const } };
      return notify(stage(next, arg, demo), 'status', `${g.stage} gap staged · 1 ${g.diffLines ? 'MR' : 'issue'}`);
    }
    case 'stage-gaps': {
      const picked = pickedGaps(s, demo);
      const next = picked.reduce((acc, g) => stage({ ...acc, gapStatus: { ...acc.gapStatus, [g.id]: 'staged' as const } }, g.id, demo), s);
      return notify(next, 'status', `${picked.length} gaps staged · 1 write each`);
    }
    case 'tick':
      return { ...s, gaps: { ...s.gaps, [arg]: !s.gaps[arg] } };
    case 'unstage':
      return unstage(s, arg, 'Taken back. Nothing was sent.');
    case 'snooze-n1':
      return notify(decided(setStatus(s, 'n1', 'snoozed'), 'promote', 'dep-bump.patch · T1 patcher', 'not yet', 'no write'), 'toast', 'Not yet · no write');
    case 'unsnooze-n1':
      return { ...setStatus(s, 'n1', 'open'), session: s.session.slice(1) };
    case 'merge-n1':
      return notify(setStatus(s, 'n1', 'merged'), 'toast', 'belay-policy!21 merged (simulated) · next pipeline reads Hands-off');
    case 'retire-n4': {
      const next = { ...setStatus({ ...s, out: unstageItem(s.out, 'n4') }, 'n4', 'retired'), sent: ['belay-policy main · retired patch-bump', ...s.sent] };
      return ranToast(decided(next, 'readmit', 'patch-bump · T8 gardener', 'retired', 'belay-policy main · commit'), READMIT.retire.result);
    }
    case 'open-runner':
      return notify({ ...s, runner: { ...s.runner, opened: true } }, 'toast', `Opened ${RUNNER.url} · nothing written`);
    case 'check-runner': {
      const seen = s.runner.opened;
      const next = notify({ ...s, runner: { ...s.runner, check: seen ? 'ok' : 'none' } }, 'status', `$ ${RUNNER.command} → ${seen ? 'runner online' : 'runner not seen yet'}`);
      return seen ? decided(setStatus(next, 'n5', 'done'), 'setup', 'Runner billing on Google Cloud', 'verified', 'belay doctor') : next;
    }
    case 'submitted':
      return ranToast({ ...s, submitted: true }, CRA.submitCommand);
    case 'out-on':
      return { ...s, outboxOpen: true };
    case 'out-off':
      return { ...s, outboxOpen: false };
    case 'out-toggle':
      return { ...s, outboxOpen: !s.outboxOpen };
    default:
      return s;
  }
}

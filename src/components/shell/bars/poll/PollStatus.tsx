'use client';

import { repollGroupAction } from '@/server/actions/repollAction';
import type { ShellPoll } from '../../ShellContext';
import { readAnswer } from '../../live/sync';
import { PollStatusView, type PollRecheck } from './PollStatusView';

/** The live recheck: one read of /api/shell, its poll health. */
const recheckLive: PollRecheck = async () => (await readAnswer())?.data.poll;

/**
 * The status bar's poll line (pollLine.ts): the age of the last good poll, ticking from the server's read; a failed
 * poll's reason; the projects that failed; and on a failure, Re-poll (one cycle of the whole group, repollGroupAction,
 * whose refresh() re-renders the layout with the fresh read). Before a healthy read ticks into "late", it asks
 * /api/shell once, so a page left open does not call a running poller late. PollStatusView draws it, with these reads.
 */
export function PollStatus({ poll }: { poll: ShellPoll }) {
  return <PollStatusView poll={poll} repoll={repollGroupAction} recheck={recheckLive} />;
}

// What Trace knows without probing GitLab: the running server's environment and the live runtime. Server-only, read at
// request time (behind connection()). The (app) layout's gate and the door read liveGate too: live before the first poll,
// or a group with no project, opens Trace instead of the error page.
import 'server-only';
import { getDataSource, readDataConfig } from '@/server/data';
import { readConfig } from '@/server/gitlab';
import { messageOf } from '@/lib/format/error';
import type { TraceFacts } from '../model/types';

export interface LiveGate {
  gate: TraceFacts['gate'];
  reason: string | null;
  projects: number | null;
}

/** Live mode only: is there a snapshot, and does it hold a project? Demo is never gated. */
export function liveGate(env: Record<string, string | undefined> = process.env): LiveGate {
  if (readDataConfig(env).mode !== 'live') return { gate: null, reason: null, projects: null };
  try {
    const projects = getDataSource(env).getFleet().projects.length;
    return { gate: projects === 0 ? 'empty' : null, reason: null, projects };
  } catch (e) {
    // the live source's own reason: the first poll still running, or a failed start being retried (data/select.ts)
    return { gate: 'not-ready', reason: messageOf(e), projects: null };
  }
}

export function loadTraceFacts(rehearse: boolean, env: Record<string, string | undefined> = process.env): TraceFacts {
  const cfg = readDataConfig(env);
  const gl = readConfig(env);
  const live = liveGate(env);
  const rehearsal = rehearse && live.gate === null;
  return {
    mode: cfg.mode,
    fake: cfg.mode === 'live' && cfg.gitlab === 'fake',
    groupId: gl.groupId,
    groupSet: Boolean(env.BELAY_GROUP_ID),
    host: gl.host ?? 'gitlab.com',
    gate: rehearsal ? 'not-ready' : live.gate,
    rehearsal,
    reason: rehearsal ? 'BELAY_MODE=live, but the first poll has not finished: the server starts it in instrumentation.ts' : live.reason,
    projects: rehearsal ? null : live.projects,
  };
}

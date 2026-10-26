// What /start knows without probing GitLab: the running server's environment (runtime settings laid under it), the
// live runtime, which name set each value, and this machine's platform. Server-only, read at request time (behind
// connection()). The (app) layout's gate and the door read liveGate too: live before the first poll, or a group with no
// project, opens /start instead of the error page. Moved from trace/data/facts.ts.
import 'server-only';
import { getDataSource, readDataConfig } from '@/server/data';
import { envOf, serverEnv, sourceOf, type Env } from '@/server/env/env';
import { readConfig } from '@/server/gitlab';
import { messageOf } from '@/lib/format/error';
import type { StartFacts, TraceFacts } from '../model/types';

export interface LiveGate {
  gate: TraceFacts['gate'];
  reason: string | null;
  projects: number | null;
}

/** Live mode only: is there a snapshot, and does it hold a project? Demo is never gated. */
export function liveGate(env: Env = serverEnv()): LiveGate {
  if (readDataConfig(env).mode !== 'live') return { gate: null, reason: null, projects: null };
  try {
    const projects = getDataSource(env).getFleet().projects.length;
    return { gate: projects === 0 ? 'empty' : null, reason: null, projects };
  } catch (e) {
    // the live source's own reason: the first poll still running, or a failed start being retried (data/select.ts)
    return { gate: 'not-ready', reason: messageOf(e), projects: null };
  }
}

const PLATFORM: Record<string, StartFacts['platform']> = { win32: 'windows', darwin: 'macos' };

/** `raw` is the process env as started: sourceOf tells the env from a runtime setting only on it. */
export function loadTraceFacts(rehearse: boolean, raw: Env = process.env): StartFacts {
  const env = serverEnv(raw);
  const cfg = readDataConfig(env);
  const gl = readConfig(env);
  const live = liveGate(env);
  const rehearsal = rehearse && live.gate === null;
  return {
    mode: cfg.mode,
    fake: cfg.mode === 'live' && cfg.gitlab === 'fake',
    groupId: gl.groupId,
    groupSet: Boolean(envOf(env, 'GROUP_ID')),
    host: gl.host ?? 'gitlab.com',
    gate: rehearsal ? 'not-ready' : live.gate,
    rehearsal,
    reason: rehearsal ? 'live, but the first poll has not finished: the server starts it in instrumentation.ts' : live.reason,
    projects: rehearsal ? null : live.projects,
    sources: { group: sourceOf(raw, 'GROUP_ID'), mode: sourceOf(raw, 'MODE'), host: sourceOf(raw, 'GITLAB_HOST') },
    platform: PLATFORM[process.platform] ?? 'linux',
  };
}

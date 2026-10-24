// Trace's Re-check: the app's own probes, run again, read only. belay doctor's probeCapabilities (its blocker names what
// stops every probe: glab, the network, the login, the group) over the GitLab this server is configured for: the live
// runtime's own port when there is one, else a fresh port of the same kind (BELAY_GITLAB: glab, or the seeded fake).
// Only GETs; nothing is written to GitLab or the index. GET /api/trace answers it, never a server action: an action holds the
// router's queue, and a slow GitLab would stall every navigation behind it. Only a request addressed to this machine is
// answered (local.ts), because it reads as the operator's own glab login.
import 'server-only';
import { notLocal } from '@/server/actions/local';
import { readDataConfig, readyRuntime } from '@/server/data';
import { createLivePort } from '@/server/data/live/ports';
import { probeCapabilities, readConfig } from '@/server/gitlab';
import { messageOf } from '@/lib/format/error';
import { judge } from '../model/judge';
import type { ProbeAnswer } from '../model/types';
import { loadTraceFacts } from './facts';

const LIMIT_MS = 12_000;
const pad = (n: number) => String(n).padStart(2, '0');
const clock = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

export async function runTraceProbe(rehearse: boolean, h: Pick<Headers, 'get'>): Promise<ProbeAnswer> {
  const away = notLocal(h);
  if (away) return { status: 'refused', reason: away };
  const cfg = readDataConfig();
  const facts = loadTraceFacts(rehearse);
  try {
    const port = readyRuntime()?.port ?? (await createLivePort(cfg.gitlab)).port;
    const timeout = new Promise<never>((_, no) => setTimeout(() => no(new Error(`no answer in ${LIMIT_MS / 1000} s`)), LIMIT_MS));
    const r = await Promise.race([probeCapabilities(port, readConfig().groupId), timeout]);
    const caps = r.capabilities.map(({ id, label, status, reason }) => ({ id, label, status, reason }));
    const nodes = judge({ blocker: r.blocker, user: r.user, group: r.group, projectCount: r.projectCount, caps }, facts);
    return { status: 'read', read: { at: clock(new Date()), nodes, caps: r.blocker && r.blocker.kind !== 'group' ? null : caps, source: cfg.gitlab } };
  } catch (e) {
    console.error('belay: trace probe failed', e);
    return { status: 'refused', reason: `the probe could not run: ${messageOf(e)}` };
  }
}

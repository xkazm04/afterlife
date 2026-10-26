// GET /api/start/probe's stream: the doctor's probes (probeCapabilities) told node by node as they settle, one ProbeEvent
// per line. The preflight (user, group, instance) decides glab, login, group and live at once, so those four nodes are
// sent before any row; then each capability as its GET answers; then the doctor and setup nodes and the whole read. Only
// GETs, over the live runtime's port when there is one, else a fresh port of the same kind. Past 12 s the screen says
// "slow" on its own; at 45 s the stream ends with a refused line. A closed connection stops the sending, not the reads.
import 'server-only';
import { readDataConfig, readyRuntime } from '@/server/data';
import { createLivePort } from '@/server/data/live/ports';
import { serverEnv } from '@/server/env/env';
import { probeCapabilities, readConfig, type GitLabPort } from '@/server/gitlab';
import type { Capability } from '@/server/gitlab/capabilities';
import { messageOf } from '@/lib/format/error';
import { judge } from '../model/judge';
import type { CapRow, NodeKey, ProbeEvent, TraceFacts } from '../model/types';
import { loadTraceFacts } from '../gate/facts';

export const HARD_STOP_MS = 45_000;
const PREFLIGHT_NODES: readonly NodeKey[] = ['glab', 'login', 'group', 'live'];
const pad = (n: number) => String(n).padStart(2, '0');
const clock = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const row = ({ id, label, status, reason }: Capability): CapRow => ({ id, label, status, reason });

export interface ProbeDeps {
  port: () => Promise<GitLabPort>;
  groupId: string;
  facts: TraceFacts;
  source: 'glab' | 'fake';
  now: () => Date;
  limitMs: number;
}

/** The running server's: its config read now (runtime settings included), the live runtime's port or a fresh one. */
export function probeDeps(env = serverEnv()): ProbeDeps {
  const cfg = readDataConfig(env);
  const facts = loadTraceFacts(false, env);
  return {
    port: async () => readyRuntime()?.port ?? (await createLivePort(cfg.gitlab)).port,
    groupId: readConfig(env).groupId, facts, source: cfg.gitlab, now: () => new Date(), limitMs: HARD_STOP_MS,
  };
}

export const lineOf = (e: ProbeEvent): string => `${JSON.stringify(e)}\n`;

/** Every event of one probe, in order, to `send`; resolves when the probe ended (done or refused). */
export async function runProbe(deps: ProbeDeps, send: (e: ProbeEvent) => void): Promise<void> {
  const { facts } = deps;
  send({ t: 'stage', stage: 'preflight' });
  const r = await probeCapabilities(await deps.port(), deps.groupId, {
    onPreflight: (seen) => {
      const nodes = judge({ blocker: seen.blocker, user: seen.user, group: seen.group, projectCount: seen.projectCount, caps: [] }, facts);
      for (const k of PREFLIGHT_NODES) send({ t: 'node', key: k, read: nodes[k] });
      send({ t: 'stage', stage: 'rows' });
    },
    onRow: (c) => send({ t: 'cap', row: row(c) }),
  });
  const caps = r.capabilities.map(row);
  const nodes = judge({ blocker: r.blocker, user: r.user, group: r.group, projectCount: r.projectCount, caps }, facts);
  send({ t: 'node', key: 'doctor', read: nodes.doctor });
  send({ t: 'node', key: 'setup', read: nodes.setup });
  send({ t: 'done', read: { at: clock(deps.now()), nodes, caps: r.blocker && r.blocker.kind !== 'group' ? null : caps, source: deps.source } });
}

/** The probe as an ndjson byte stream: ends after `done`, after a refused line on a failure, or at the hard stop. */
export function probeStream(deps: ProbeDeps): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  return new ReadableStream<Uint8Array>({
    start(c) {
      const send = (e: ProbeEvent): void => {
        if (!closed) c.enqueue(enc.encode(lineOf(e)));
      };
      const end = (): void => {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        c.close();
      };
      timer = setTimeout(() => {
        send({ t: 'refused', reason: `GitLab did not finish answering in ${deps.limitMs / 1000} s: check again` });
        end();
      }, deps.limitMs);
      runProbe(deps, send).then(end, (e: unknown) => {
        console.error('afterlife: start probe failed', e);
        send({ t: 'refused', reason: `the probe could not run: ${messageOf(e)}` });
        end();
      });
    },
    cancel() {
      closed = true;
      clearTimeout(timer);
    },
  });
}

// Starts live mode when the server starts (called from src/instrumentation.ts). In demo mode it does nothing, and tests
// never call it: the scheduler it starts is the only timer the poller has.
import { readDataConfig } from './config';
import { pollIntervalMs } from '@/server/poller';
import { startRuntime, type LiveRuntime } from './live/runtime';

export async function bootLive(env: Record<string, string | undefined> = process.env): Promise<void> {
  const cfg = readDataConfig(env);
  if (cfg.mode !== 'live') return;
  let rt: LiveRuntime;
  try {
    rt = await startRuntime(cfg);
  } catch (e) {
    // Not rethrown: a register() that rejects stops the server from preparing, and the pages are what name a failed start and retry it (select.ts).
    console.error(`belay: live start failed: ${e instanceof Error ? e.message : String(e)}; the pages name it and the start is retried every ${pollIntervalMs() / 1000}s`);
    return;
  }
  const failed = rt.last?.projects.filter((p) => !p.ok).length ?? 0;
  console.log(`belay: live data from ${cfg.gitlab === 'fake' ? 'the seeded fake GitLab (replay clock)' : 'glab'}; ${rt.last?.projects.length ?? 0} project(s) polled${rt.last?.error ? `, group error: ${rt.last.error}` : failed ? `, ${failed} failed` : ''}`);
}

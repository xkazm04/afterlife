// Starts live mode when the server starts (called from src/instrumentation.ts). In demo mode it does nothing, and tests
// never call it: the scheduler it starts is the only timer the poller has.
import { readDataConfig } from './config';
import { startRuntime } from './live/runtime';

export async function bootLive(env: Record<string, string | undefined> = process.env): Promise<void> {
  const cfg = readDataConfig(env);
  if (cfg.mode !== 'live') return;
  const rt = await startRuntime(cfg);
  const failed = rt.last?.projects.filter((p) => !p.ok).length ?? 0;
  console.log(`belay: live data from ${cfg.gitlab === 'fake' ? 'the seeded fake GitLab (replay clock)' : 'glab'}; ${rt.last?.projects.length ?? 0} project(s) polled${rt.last?.error ? `, group error: ${rt.last.error}` : failed ? `, ${failed} failed` : ''}`);
}

// Picks the data source for a request: BELAY_MODE=demo (default) or live. The choice is read per call, so a page rendered
// for a request always follows the running server's environment, never the one the build ran in.
import { actionDeps } from '@/server/actions/deps';
import { pollIntervalMs } from '@/server/poller';
import { demoSource } from './demoSource';
import { readDataConfig } from './config';
import { liveSource } from './live/liveSource';
import { lastStartFailure, readyRuntime, startInFlight, startRuntime } from './live/runtime';
import type { DataSource } from './types';

let override: DataSource | null = null;

/** No runtime is ready: say why. A failed start is named and retried (once, not awaited, no oftener than a poll interval). */
function notReady(env: Record<string, string | undefined>): Error {
  const failed = lastStartFailure();
  if (!failed) return new Error('BELAY_MODE=live, but the first poll has not finished: the server starts it in instrumentation.ts');
  if (!startInFlight() && Date.now() - failed.at >= pollIntervalMs()) {
    startRuntime(readDataConfig(env)).catch(() => undefined); // the failure is kept by startRuntime; the next read names it
  }
  return new Error(`BELAY_MODE=live, but the live start failed: ${failed.message}. It is retried every ${pollIntervalMs() / 1000}s.`);
}

/** Tests pin a source (and clear it with null). Never called by the app. */
export function setDataSource(ds: DataSource | null): void {
  override = ds;
}

export function getDataSource(env: Record<string, string | undefined> = process.env): DataSource {
  if (override) return override;
  if (readDataConfig(env).mode === 'demo') return demoSource;
  return liveSource(() => {
    const snap = readyRuntime()?.snapshot;
    if (!snap) throw notReady(env);
    return snap;
  }, undefined, () => actionDeps(env));
}

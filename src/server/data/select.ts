// Picks the data source for a request: BELAY_MODE=demo (default) or live. The choice is read per call, so a page rendered
// for a request always follows the running server's environment, never the one the build ran in.
import { demoSource } from './demoSource';
import { readDataConfig } from './config';
import { liveSource } from './live/liveSource';
import { readyRuntime } from './live/runtime';
import type { DataSource } from './types';

let override: DataSource | null = null;

/** Tests pin a source (and clear it with null). Never called by the app. */
export function setDataSource(ds: DataSource | null): void {
  override = ds;
}

export function getDataSource(env: Record<string, string | undefined> = process.env): DataSource {
  if (override) return override;
  if (readDataConfig(env).mode === 'demo') return demoSource;
  return liveSource(() => {
    const snap = readyRuntime()?.snapshot;
    if (!snap) throw new Error('BELAY_MODE=live, but the first poll has not finished: the server starts it in instrumentation.ts');
    return snap;
  });
}

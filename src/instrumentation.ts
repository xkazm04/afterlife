// Runs once when the Next server starts. In live mode (BELAY_MODE=live) it starts the poller and waits for the first
// cycle, so the first page already has data; in demo mode it does nothing. Node only: the poller shells out to glab.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { bootLive } = await import('./server/data/boot');
  await bootLive();
}

/** Next calls this for every server render/route/action failure: one `belay:` line that carries the digest the error page shows, so an operator can join the two. */
export function onRequestError(err: unknown, _request: { path: string; method: string }, context: { routePath: string }): void {
  const digest = typeof err === 'object' && err !== null && 'digest' in err ? String(err.digest) : 'none';
  console.error(`belay: ${context.routePath} failed (digest ${digest}): ${err instanceof Error ? err.message : String(err)}`);
}

// Runs once when the Next server starts. In live mode (BELAY_MODE=live) it starts the poller and waits for the first
// cycle, so the first page already has data; in demo mode it does nothing. Node only: the poller shells out to glab.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { bootLive } = await import('./server/data/boot');
  await bootLive();
}

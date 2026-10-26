import type { Instrumentation } from 'next';

// Runs once when the Next server starts. In live mode (AFTERLIFE_MODE=live) it starts the poller and waits for the first
// cycle, so the first page already has data; in demo mode it does nothing. Node only: the poller shells out to glab.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { bootLive } = await import('./server/data/boot');
  await bootLive();
}

/**
 * Next calls this for every server render/route/action failure: one `afterlife:` line that carries the digest the error page shows,
 * so an operator can join the two. The request's own path names which project or item failed (the route path is only the file
 * pattern), the method and route type tell a failed action from a failed render; the query string is never logged.
 */
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const digest = typeof err === 'object' && err !== null && 'digest' in err ? String(err.digest) : 'none';
  const path = request.path.split('?')[0];
  const message = err instanceof Error ? err.message : String(err);
  console.error(`afterlife: ${request.method} ${path} (route ${context.routePath}, ${context.routeType}) failed (digest ${digest}): ${message}`);
};

// Live writes and re-polls act as the operator's own glab login, so they answer only a request addressed to this machine
// by a loopback name. `next dev` and `next start` listen on 0.0.0.0 unless given `-H`; Next refuses an Origin that differs
// from the Host, but lets a request with no Origin through, and a page reached through DNS rebinding sends its own name as
// both Host and Origin. A page cannot set Host, so a Host, X-Forwarded-Host or Origin that names anything but localhost,
// 127.0.0.1 or [::1] is refused. A process that can reach the port can still forge all three: listen on loopback only.
// Pure, so it is tested without a request.

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/** The host name in a Host header value ("localhost:3000" -> "localhost", "[::1]:3000" -> "[::1]"), or null. */
function hostName(v: string): string | null {
  const m = /^(\[[0-9a-f:.]+\]|[^:[\]/\s]+)(?::\d{1,5})?$/i.exec(v.trim());
  return m?.[1]?.toLowerCase() ?? null;
}

const isLoopback = (v: string): boolean => LOOPBACK.has(hostName(v) ?? '');

function originIsLoopback(origin: string): boolean {
  try {
    const u = new URL(origin);
    return (u.protocol === 'http:' || u.protocol === 'https:') && LOOPBACK.has(u.hostname.toLowerCase());
  } catch {
    return false; // "null" (an opaque origin) and anything else that is not a URL
  }
}

/** Why this request may not drive a live action, or null when it is addressed to this machine. */
export function notLocal(h: Pick<Headers, 'get'>): string | null {
  const host = h.get('host');
  const forwarded = h.get('x-forwarded-host');
  const origin = h.get('origin');
  const named =
    !host || !isLoopback(host) ? host ?? 'no host'
      : forwarded !== null && !forwarded.split(',').every(isLoopback) ? forwarded
        : origin !== null && !originIsLoopback(origin) ? origin
          : null;
  return named === null
    ? null
    : `this request names ${JSON.stringify(named)}, not localhost: Belay acts as your glab login only for a page on this machine`;
}

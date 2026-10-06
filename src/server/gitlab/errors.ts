// Typed failures of a GitLab call. Callers branch on `kind`; nothing here carries a token.

export type GitLabErrorKind =
  | 'auth' // 401, or glab has no usable login
  | 'forbidden' // 403: no permission, or the plan lacks the feature
  | 'not-found' // 404: missing resource, or an endpoint the plan does not have
  | 'rate-limited' // 429, after the backoff retries ran out
  | 'network' // could not reach GitLab
  | 'binary' // the glab binary could not be started
  | 'api' // any other HTTP failure
  | 'parse'; // GitLab answered, but not with the shape we expected

export class GitLabError extends Error {
  constructor(
    readonly kind: GitLabErrorKind,
    message: string,
    readonly endpoint: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'GitLabError';
  }
}

export interface RawFailure { code: number; stdout: string; stderr: string }

const NETWORK = /dial tcp|no such host|i\/o timeout|connection (refused|reset)|timeout|ENOTFOUND|ECONNRESET|EAI_AGAIN|network is unreachable/i;
const NO_LOGIN = /no token|not logged in|authentication required|glab auth login|401/i;

/** The HTTP status glab reports: "glab: 403 Forbidden (HTTP 403)" or "glab: HTTP 404" on stderr. */
export function statusOf(f: RawFailure): number | null {
  const m = /\(HTTP (\d{3})\)|HTTP (\d{3})|glab: (\d{3})/.exec(f.stderr) ?? /"(?:message|error)":"(\d{3}) /.exec(f.stdout);
  const code = m?.slice(1).find((x) => x !== undefined);
  return code ? Number(code) : null;
}

/** Maps a non-zero glab exit to a typed error. Status wins over text; text only when no status. */
export function failureToError(f: RawFailure, endpoint: string): GitLabError {
  const status = statusOf(f);
  const detail = (f.stderr.trim() || f.stdout.trim()).split('\n')[0]?.slice(0, 200) ?? 'glab failed';
  if (status === 401) return new GitLabError('auth', detail, endpoint, status);
  if (status === 403) return new GitLabError('forbidden', detail, endpoint, status);
  if (status === 404) return new GitLabError('not-found', detail, endpoint, status);
  if (status === 429) return new GitLabError('rate-limited', detail, endpoint, status);
  if (status !== null) return new GitLabError('api', detail, endpoint, status);
  if (NO_LOGIN.test(f.stderr)) return new GitLabError('auth', detail, endpoint);
  if (NETWORK.test(f.stderr)) return new GitLabError('network', detail, endpoint);
  return new GitLabError('api', detail, endpoint);
}

export function isKind(e: unknown, ...kinds: GitLabErrorKind[]): e is GitLabError {
  return e instanceof GitLabError && kinds.includes(e.kind);
}

// A tiny `glab api` server: parses the argv the adapter builds and answers like GitLab does,
// including glab's own error format (JSON body on stdout, "glab: 403 Forbidden (HTTP 403)" on stderr).
import type { ExecResult } from '../adapter/exec';
import type { FakeState, ProjectData } from './dataset';

export interface Req { method: string; path: string; query: URLSearchParams; fields: Record<string, string> }
export interface Res { status: number; json?: unknown; text?: string }
export type Handler = (st: FakeState, m: RegExpExecArray, req: Req) => Res;
export type Route = [method: string, pattern: RegExp, handler: Handler];

export const ok = (json: unknown): Res => ({ status: 200, json });
export const created = (json: unknown): Res => ({ status: 201, json });
export const fail = (status: number, message: string): Res => ({ status, json: { message: `${status} ${message}` } });

/** `api [--hostname h] [--method M] <url> [-f k=v]...` */
export function parseArgs(args: readonly string[]): Req {
  const fields: Record<string, string> = {};
  let method = '';
  let url = '';
  for (let i = 1; i < args.length; i++) {
    const a = args[i] ?? '';
    if (a === '--hostname') i++;
    else if (a === '--method') method = args[++i] ?? '';
    else if (a === '-f') {
      const kv = args[++i] ?? '';
      const eq = kv.indexOf('=');
      fields[kv.slice(0, eq)] = kv.slice(eq + 1);
    } else if (!a.startsWith('-') && !url) url = a;
  }
  const [path = '', qs = ''] = url.split('?');
  return { method: method || (Object.keys(fields).length ? 'POST' : 'GET'), path, query: new URLSearchParams(qs), fields };
}

export function paged<T>(items: T[], q: URLSearchParams): T[] {
  const per = Number(q.get('per_page') ?? 20);
  const page = Number(q.get('page') ?? 1);
  return items.slice((page - 1) * per, page * per);
}

/** A project by numeric id or by URL-encoded path. */
export function findProject(st: FakeState, key: string): ProjectData | null {
  const k = decodeURIComponent(key);
  return st.projects.find((p) => String(p.raw.id) === k || p.raw.path_with_namespace === k) ?? null;
}

export function toExec(res: Res): ExecResult {
  const stdout = res.text ?? JSON.stringify(res.json ?? null);
  if (res.status < 400) return { code: 0, stdout, stderr: '' };
  const message = String((res.json as { message?: string } | undefined)?.message ?? res.status);
  return { code: 1, stdout, stderr: `glab: ${message} (HTTP ${res.status})\n` };
}

export function dispatch(routes: readonly Route[], st: FakeState, args: readonly string[]): Res {
  const req = parseArgs(args);
  if (req.method !== 'GET') st.writes.push({ method: req.method, path: req.path, fields: req.fields });
  for (const [method, pattern, handler] of routes) {
    const m = pattern.exec(req.path);
    if (method === req.method && m) return handler(st, m, req);
  }
  return fail(404, 'Not Found');
}

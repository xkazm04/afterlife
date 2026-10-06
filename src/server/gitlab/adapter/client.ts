// Low-level `glab api` access: GET with pagination and backoff, and running a planned write.
// Auth is glab's own keyring login; this file never sees or stores a token.
import { GitLabError, failureToError } from '../errors';
import type { ExecFn, ExecResult } from './exec';

export interface ClientConfig {
  bin: string; // path or name of the glab binary
  host?: string; // GitLab hostname; glab's own default when omitted
  exec: ExecFn;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number; // on 429 only
  backoffMs?: number; // first wait; doubles each retry
  pageSize?: number;
  maxPages?: number;
}

export type Query = Record<string, string | number | boolean | undefined>;

export class GlabClient {
  constructor(private readonly cfg: ClientConfig) {}

  get host(): string | undefined { return this.cfg.host; }

  private url(path: string, query: Query = {}): string {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined) q.set(k, String(v));
    const s = q.toString();
    return s ? `${path}?${s}` : path;
  }

  private args(url: string): string[] {
    return ['api', ...(this.cfg.host ? ['--hostname', this.cfg.host] : []), url];
  }

  /** One GET. Retries 429 with exponential backoff, then throws 'rate-limited'. */
  private async getRaw(url: string): Promise<string> {
    const retries = this.cfg.maxRetries ?? 3;
    const sleep = this.cfg.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
    for (let attempt = 0; ; attempt++) {
      const r = await this.cfg.exec(this.cfg.bin, this.args(url));
      if (r.code === 0) return r.stdout;
      const err = failureToError(r, url);
      if (err.kind !== 'rate-limited' || attempt >= retries) throw err;
      await sleep((this.cfg.backoffMs ?? 1000) * 2 ** attempt);
    }
  }

  async getText(path: string, query?: Query): Promise<string> {
    return this.getRaw(this.url(path, query));
  }

  async getJson(path: string, query?: Query): Promise<unknown> {
    const url = this.url(path, query);
    const out = await this.getRaw(url);
    try {
      return out.trim() === '' ? null : JSON.parse(out);
    } catch {
      throw new GitLabError('parse', 'response is not JSON', url);
    }
  }

  /** Walks page=1.. until a short page, `limit` items, or maxPages. Concatenates the arrays. */
  async getPages(path: string, query: Query = {}, limit?: number): Promise<unknown[]> {
    const perPage = Math.min(this.cfg.pageSize ?? 100, limit ?? Infinity);
    const maxPages = this.cfg.maxPages ?? 50;
    const all: unknown[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const body = await this.getJson(path, { ...query, per_page: perPage, page });
      if (!Array.isArray(body)) throw new GitLabError('parse', 'expected a JSON array', path);
      all.push(...body);
      if (body.length < perPage || (limit !== undefined && all.length >= limit)) break;
    }
    return limit === undefined ? all : all.slice(0, limit);
  }

  /** Runs a planned write once. No retry: a write is never repeated without the operator. */
  async run(argv: readonly string[]): Promise<ExecResult> {
    const r = await this.cfg.exec(this.cfg.bin, argv);
    if (r.code !== 0) throw failureToError(r, argv.find((a) => /^[a-z_]+\//.test(a)) ?? 'glab api');
    return r;
  }
}

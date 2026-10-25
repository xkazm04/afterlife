// git, read-only, for discovery: execFile (argv, never a shell), a short timeout, and no exception for a path that is not
// a repo - that is an answer (undefined), not an error.
import { execFile } from 'node:child_process';

/** git's trimmed stdout, or undefined when it exits non-zero, times out or cannot start. */
export function gitOut(cwd: string, args: readonly string[], timeoutMs = 10_000): Promise<string | undefined> {
  return new Promise((resolve) => {
    execFile('git', ['-C', cwd, ...args], { encoding: 'utf8', windowsHide: true, timeout: timeoutMs, maxBuffer: 1 << 20 }, (err, stdout) => {
      const out = stdout.trim();
      resolve(err || !out ? undefined : out);
    });
  });
}

/** Maps with at most `limit` calls in flight; results keep the input order. */
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** A root as compared across sources: forward slashes, no trailing slash, case-folded on Windows. */
export function rootKey(root: string, platform = process.platform): string {
  const p = root.replace(/\\/g, '/').replace(/\/+$/, '');
  return platform === 'win32' ? p.toLowerCase() : p;
}

// Where a Claude Code session ran. ~/.claude/projects/<dir> names are a lossy dash-encoding of the path, so the real one
// is the `cwd` field of the session's JSONL lines. Only the newest file per dir is read, and only its first 64 KB: a
// long session's file runs to megabytes and the cwd is on one of its first lines.
import { closeSync, openSync, readdirSync, readSync, statSync } from 'node:fs';
import path from 'node:path';

export const MAX_HEAD = 64 * 1024;

/** The newest `*.jsonl` in a dir by mtime, with that mtime; undefined when there is none. */
export function newestJsonl(dir: string): { file: string; mtimeMs: number } | undefined {
  let best: { file: string; mtimeMs: number } | undefined;
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return undefined;
  }
  for (const n of names) {
    if (!n.endsWith('.jsonl')) continue;
    const file = path.join(dir, n);
    try {
      const st = statSync(file);
      if (st.isFile() && (!best || st.mtimeMs > best.mtimeMs)) best = { file, mtimeMs: st.mtimeMs };
    } catch {
      /* gone between the listing and the stat */
    }
  }
  return best;
}

const cwdOfLine = (line: string): string | undefined => {
  if (!line.includes('"cwd"')) return undefined;
  try {
    const o: unknown = JSON.parse(line);
    const cwd = typeof o === 'object' && o !== null ? (o as { cwd?: unknown }).cwd : undefined;
    return typeof cwd === 'string' && cwd ? cwd : undefined;
  } catch {
    return undefined;
  }
};

/** A `"cwd":"..."` in a line cut off at the cap: the string literal alone is parsed. */
const cwdInPartial = (text: string): string | undefined => {
  const m = /"cwd"\s*:\s*("(?:[^"\\]|\\.)*")/.exec(text);
  if (!m?.[1]) return undefined;
  try {
    const v: unknown = JSON.parse(m[1]);
    return typeof v === 'string' && v ? v : undefined;
  } catch {
    return undefined;
  }
};

/** The first string `cwd` in the file's first `max` bytes, read in chunks so most files stop after one. */
export function firstCwd(file: string, max = MAX_HEAD): string | undefined {
  let fd: number;
  try {
    fd = openSync(file, 'r');
  } catch {
    return undefined;
  }
  try {
    const buf = Buffer.alloc(Math.min(max, 16 * 1024));
    let text = '';
    let read = 0;
    while (read < max) {
      const n = readSync(fd, buf, 0, Math.min(buf.length, max - read), read);
      if (n <= 0) break;
      read += n;
      text += buf.toString('utf8', 0, n);
      const lines = text.split('\n');
      text = lines.pop() ?? '';
      for (const l of lines) {
        const cwd = cwdOfLine(l);
        if (cwd) return cwd;
      }
    }
    return cwdOfLine(text) ?? cwdInPartial(text);
  } finally {
    closeSync(fd);
  }
}

const SKIP = ['/appdata/local/temp', '/tmp/', 'build-session', 'belay-reflect', '.claude/worktrees'];

/** A cwd that is scratch, not a project: temp dirs, build sessions, belay's reflect calls and agent worktrees. */
export function isScratchPath(cwd: string): boolean {
  const p = `${cwd.replace(/\\/g, '/').toLowerCase()}/`;
  return SKIP.some((s) => p.includes(s));
}

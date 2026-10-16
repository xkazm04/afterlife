// Unified diff parser (git format, or plain `---`/`+++` pairs). Hunks are read by their line counts, so a
// deleted line that happens to start with `--` is never mistaken for a file header.
export interface DiffLine {
  kind: 'add' | 'del' | 'ctx';
  text: string;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffFile {
  oldPath: string | null;
  newPath: string | null;
  path: string; // new path, or the old one for a deletion
  status: 'added' | 'deleted' | 'renamed' | 'modified';
  hunks: DiffHunk[];
  added: number;
  removed: number;
  binary: boolean;
}

const HUNK = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

const C_ESCAPES: Record<string, number> = { a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13, '"': 34, '\\': 92 };

/**
 * Git quotes a path that holds a tab, quote, backslash, newline or non-ASCII byte: `"dir/a\tb\303\244.yml"`. The quotes
 * and C escapes (octal bytes, UTF-8) are undone here, so a denied path is seen by its real name, not its quoted spelling.
 */
function unquoteGit(p: string): string {
  const t = p.trim();
  if (t.length < 2 || !t.startsWith('"') || !t.endsWith('"')) return t;
  const chars = [...t.slice(1, -1)];
  const bytes: number[] = [];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i] ?? '';
    if (c !== '\\') {
      bytes.push(...new TextEncoder().encode(c));
      continue;
    }
    const oct = chars.slice(i + 1, i + 4).join('');
    if (/^[0-7]{3}$/.test(oct)) {
      bytes.push(parseInt(oct, 8));
      i += 3;
    } else if (chars[i + 1] !== undefined && Object.hasOwn(C_ESCAPES, chars[i + 1] ?? '')) {
      bytes.push(C_ESCAPES[chars[i + 1] ?? ''] ?? 92);
      i += 1;
    } else bytes.push(92);
  }
  return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
}

function cleanPath(p: string): string | null {
  const t = unquoteGit(p.split('\t')[0]?.trim() ?? '');
  if (t === '/dev/null') return null;
  return t.replace(/^[ab]\//, '');
}

const QUOTED = /^"(?:[^"\\]|\\.)*"/;

/**
 * The two paths of a `diff --git <a> <b>` line. Git quotes each one on its own, and a mode change or a binary file has no
 * `---` / `+++` lines to name it, so a header this cannot split would drop the file (and its denied path) from the diff.
 */
function headerPaths(rest: string): [string, string] | null {
  const q = QUOTED.exec(rest);
  if (q) {
    const b = rest.slice(q[0].length).trimStart();
    return b ? [q[0], b] : null;
  }
  const m = /^(.+?) ("b\/.*"|b\/.+)$/.exec(rest);
  return m ? [m[1] ?? '', m[2] ?? ''] : null;
}

function blank(): DiffFile {
  return { oldPath: null, newPath: null, path: '', status: 'modified', hunks: [], added: 0, removed: 0, binary: false };
}

export function parseDiff(text: string): DiffFile[] {
  const files: DiffFile[] = [];
  let cur: DiffFile | null = null;
  let sawOld = false;
  let hunk: DiffHunk | null = null;
  let oldLeft = 0;
  let newLeft = 0;
  const begin = (): DiffFile => {
    const f = blank();
    files.push(f);
    return f;
  };

  for (const raw of text.split('\n')) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (cur && hunk && (oldLeft > 0 || newLeft > 0)) {
      if (line.startsWith('\\')) continue;
      const c = line[0];
      const body = line.slice(1);
      if (c === '+') {
        hunk.lines.push({ kind: 'add', text: body });
        cur.added++;
        newLeft--;
      } else if (c === '-') {
        hunk.lines.push({ kind: 'del', text: body });
        cur.removed++;
        oldLeft--;
      } else {
        hunk.lines.push({ kind: 'ctx', text: body });
        oldLeft--;
        newLeft--;
      }
      continue;
    }
    hunk = null;
    const m = HUNK.exec(line);
    if (m && cur) {
      oldLeft = m[2] === undefined ? 1 : Number(m[2]);
      newLeft = m[4] === undefined ? 1 : Number(m[4]);
      hunk = { header: line, lines: [] };
      cur.hunks.push(hunk);
    } else if (line.startsWith('diff --git ')) {
      const f = (cur = begin());
      sawOld = false;
      const h = headerPaths(line.slice(11));
      f.oldPath = h ? cleanPath(h[0]) : null;
      f.newPath = h ? cleanPath(h[1]) : null;
    } else if (line.startsWith('--- ') && (!cur || cur.hunks.length > 0 || sawOld)) {
      const f = (cur = begin());
      f.oldPath = cleanPath(line.slice(4));
      sawOld = true;
    } else if (line.startsWith('--- ') && cur) {
      cur.oldPath = cleanPath(line.slice(4));
      sawOld = true;
    } else if (line.startsWith('+++ ') && cur) cur.newPath = cleanPath(line.slice(4));
    else if (cur && line.startsWith('rename from ')) cur.oldPath = unquoteGit(line.slice(12));
    else if (cur && line.startsWith('rename to ')) {
      cur.newPath = unquoteGit(line.slice(10));
      cur.status = 'renamed';
    } else if (cur && line.startsWith('new file mode')) cur.status = 'added';
    else if (cur && line.startsWith('deleted file mode')) cur.status = 'deleted';
    else if (cur && (line.startsWith('Binary files ') || line.startsWith('GIT binary patch'))) cur.binary = true;
  }

  for (const f of files) {
    if (f.oldPath === null && f.newPath !== null && f.status === 'modified') f.status = 'added';
    if (f.newPath === null && f.oldPath !== null) f.status = 'deleted';
    if (f.oldPath && f.newPath && f.oldPath !== f.newPath) f.status = 'renamed';
    f.path = f.newPath ?? f.oldPath ?? '';
  }
  return files.filter((f) => f.path !== '');
}

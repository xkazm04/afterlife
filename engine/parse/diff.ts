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

function cleanPath(p: string): string | null {
  const t = p.split('\t')[0]?.trim() ?? '';
  if (t === '/dev/null') return null;
  return t.replace(/^"|"$/g, '').replace(/^[ab]\//, '');
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
      const h = /^diff --git (.+?) b\/(.+)$/.exec(line);
      f.oldPath = h ? cleanPath(h[1] ?? '') : null;
      f.newPath = h ? cleanPath(`b/${h[2] ?? ''}`) : null;
    } else if (line.startsWith('--- ') && (!cur || cur.hunks.length > 0 || sawOld)) {
      const f = (cur = begin());
      f.oldPath = cleanPath(line.slice(4));
      sawOld = true;
    } else if (line.startsWith('--- ') && cur) {
      cur.oldPath = cleanPath(line.slice(4));
      sawOld = true;
    } else if (line.startsWith('+++ ') && cur) cur.newPath = cleanPath(line.slice(4));
    else if (cur && line.startsWith('rename from ')) cur.oldPath = line.slice(12);
    else if (cur && line.startsWith('rename to ')) {
      cur.newPath = line.slice(10);
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

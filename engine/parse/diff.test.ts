import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fx } from '../__tests__/helpers';
import { parseDiff } from './diff';

describe('parseDiff', () => {
  it('reads the patcher fix: a modified file and a new test file', () => {
    const files = parseDiff(fs.readFileSync(fx('exploit', 'fix.diff'), 'utf8'));
    expect(files.map((f) => [f.path, f.status, f.added, f.removed])).toEqual([
      ['statements/src/main/kotlin/io/ledgerline/statements/ExportService.kt', 'modified', 3, 2],
      ['statements/src/test/kotlin/io/ledgerline/statements/StatementExportTraversalTest.kt', 'added', 30, 0],
    ]);
    expect(files[0]?.hunks[0]?.lines.filter((l) => l.kind === 'ctx')).toHaveLength(5);
  });

  it('reads hunks by their line counts, so a removed "-- x" line is not a file header', () => {
    const diff = ['diff --git a/q.sql b/q.sql', '--- a/q.sql', '+++ b/q.sql', '@@ -1,3 +1,3 @@', ' select 1;', '--- drop me', '+-- kept', ' select 2;', ''].join('\n');
    const [f, ...rest] = parseDiff(diff);
    expect(rest).toHaveLength(0);
    expect(f?.removed).toBe(1);
    expect(f?.hunks[0]?.lines.map((l) => l.kind)).toEqual(['ctx', 'del', 'add', 'ctx']);
  });

  it('reads plain unified diffs without a git header, several files in a row', () => {
    const diff = ['--- a/one.txt', '+++ b/one.txt', '@@ -1 +1 @@', '-a', '+b', '--- a/two.txt', '+++ b/two.txt', '@@ -1,2 +1,2 @@', ' x', '-y', '+z'].join('\n');
    expect(parseDiff(diff).map((f) => [f.path, f.added, f.removed])).toEqual([['one.txt', 1, 1], ['two.txt', 1, 1]]);
  });

  it('reads renames, deletions, binary files and the no-newline marker; tolerates CRLF', () => {
    const diff = [
      'diff --git a/old.kt b/new.kt', 'similarity index 90%', 'rename from old.kt', 'rename to new.kt', '--- a/old.kt', '+++ b/new.kt', '@@ -1 +1 @@', '-a', '\\ No newline at end of file', '+b',
      'diff --git a/gone.kt b/gone.kt', 'deleted file mode 100644', '--- a/gone.kt', '+++ /dev/null', '@@ -1,2 +0,0 @@', '-x', '-y',
      'diff --git a/logo.png b/logo.png', 'Binary files a/logo.png and b/logo.png differ',
    ].join('\r\n');
    const files = parseDiff(diff);
    expect(files.map((f) => [f.path, f.status, f.oldPath])).toEqual([['new.kt', 'renamed', 'old.kt'], ['gone.kt', 'deleted', 'gone.kt'], ['logo.png', 'modified', 'logo.png']]);
    expect(files[1]?.removed).toBe(2);
    expect(files[2]?.binary).toBe(true);
  });

  it('returns nothing for text that is not a diff', () => {
    expect(parseDiff('')).toEqual([]);
    expect(parseDiff('hello\nworld')).toEqual([]);
  });
});

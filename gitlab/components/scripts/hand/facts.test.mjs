// F127: facts.mjs rebuilds the MR's diff from the compare API for derive-gate's `engine gate --diff`. A path is written as
// git writes it, quoted when it holds a line break, so a file name cannot begin a header line of its own and hide a
// denied path from the envelope.
import { describe, expect, it } from 'vitest';
import { parseDiff } from '../../../../engine/parse/diff';
import { matchesPath } from '../../../../engine/policy/glob';
import { gitPath, unifiedDiff } from './facts.mjs';

const added = (p) => ({ old_path: p, new_path: p, new_file: true, deleted_file: false, diff: '@@ -0,0 +1 @@\n+x\n' });

describe('the diff facts.mjs rebuilds', () => {
  it('a new file whose name holds a forged +++ line is read by its real name, inside the denied folder', () => {
    const name = 'infra/x\n+++ b/ok.txt';
    const files = parseDiff(unifiedDiff([added(name)]));
    expect(files.map((f) => f.path)).toEqual([name]);
    expect(matchesPath('infra/**', files[0].path)).toBe(true);
  });

  it('quotes a quote, a backslash, a tab and other control bytes as git does, and decodes back to the name', () => {
    for (const name of ['a"b.txt', 'a\\b.txt', 'a\tb.txt', 'a\rb.txt', 'a\x01b.txt', 'ü.txt']) {
      expect(parseDiff(unifiedDiff([added(name)])).map((f) => f.path), JSON.stringify(name)).toEqual([name]);
    }
    expect(gitPath('b/', 'a\x01\nb')).toBe('"b/a\\001\\nb"');
  });

  it('leaves a plain path bare, byte for byte as before', () => {
    expect(gitPath('a/', 'src/main/Export.kt')).toBe('a/src/main/Export.kt');
    expect(unifiedDiff([{ old_path: 'x.kt', new_path: 'x.kt', new_file: false, deleted_file: false, diff: '@@ -1 +1 @@\n-a\n+b' }]))
      .toBe('diff --git a/x.kt b/x.kt\n--- a/x.kt\n+++ b/x.kt\n@@ -1 +1 @@\n-a\n+b\n');
  });
});

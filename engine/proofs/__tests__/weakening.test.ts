import { describe, expect, it } from 'vitest';
import { parseDiff } from '../../parse/diff';
import { findWeakening, isTestPath, strengthOf } from '../weakening';

const T = 'src/test/kotlin/FooTest.kt';
const edit = (path: string, body: string[], counts = { old: 0, nu: 0 }): string => {
  const o = counts.old || body.filter((l) => l[0] !== '+').length;
  const n = counts.nu || body.filter((l) => l[0] !== '-').length;
  return `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -1,${o} +1,${n} @@\n${body.join('\n')}\n`;
};
const kinds = (diff: string): string[] => findWeakening(parseDiff(diff)).map((w) => w.kind);

describe('strength of an assertion', () => {
  it('ranks exact above partial above truthiness above nothing', () => {
    expect(strengthOf('assertEquals(expected, actual)')).toBe(3);
    expect(strengthOf('expect(x).toBe(4)')).toBe(3);
    expect(strengthOf('assertFailsWith<ExportFileNotFound> { f() }')).toBe(3);
    expect(strengthOf('assertContains(list, item)')).toBe(3);
    expect(strengthOf('expect(x).toContain("a")')).toBe(2);
    expect(strengthOf('assertTrue(x.isOk)')).toBe(1);
    expect(strengthOf('assertThrows<Exception> { f() }')).toBe(1);
    expect(strengthOf('assertFails { f() }')).toBe(1);
    expect(strengthOf('assert ok')).toBe(1);
    expect(strengthOf('assertTrue(true)')).toBe(0);
    expect(strengthOf('val x = compute()')).toBeNull();
  });
  it('recognises test files across ecosystems', () => {
    for (const p of ['src/test/kotlin/A.kt', 'a/FooTest.java', 'web/foo.test.ts', 'pkg/foo_test.go', 'tests/test_a.py', 'spec/a_spec.rb']) expect(isTestPath(p), p).toBe(true);
    for (const p of ['src/main/kotlin/A.kt', 'README.md', 'attest.ts']) expect(isTestPath(p), p).toBe(false);
  });
});

describe('findWeakening', () => {
  it('flags a removed assertion with nothing in its place', () => {
    expect(kinds(edit(T, [' fun a() {', '-    assertEquals(1, f())', ' }']))).toEqual(['removed-assertion']);
  });
  it('flags a loosened assertion and names both lines', () => {
    const w = findWeakening(parseDiff(edit(T, ['-    assertEquals(1, f())', '+    assertNotNull(f())'])));
    expect(w.map((x) => x.kind)).toEqual(['loosened-assertion']);
    expect(w[0]?.detail).toContain('assertNotNull');
  });
  it('flags a typed exception widened to a generic one, and a vitest toBe turned into toBeDefined', () => {
    expect(kinds(edit(T, ['-    assertThrows<ExportFileNotFound> { f() }', '+    assertThrows<Exception> { f() }']))).toEqual(['loosened-assertion']);
    expect(kinds(edit('web/a.test.ts', ['-  expect(a).toBe(2);', '+  expect(a).toBeDefined();']))).toEqual(['loosened-assertion']);
  });
  it('flags skipped, disabled and focused-out tests', () => {
    for (const line of ['+    @Disabled("flaky")', '+    @Ignore', '+  it.skip("x", () => {})', '+  xit("x", () => {})', '+@pytest.mark.skip(reason="no")', '+    t.Skip("later")', '+    assumeTrue(false)']) {
      expect(kinds(edit(T, [' fun a() {', line, ' }'])), line).toEqual(['skip-added']);
    }
  });
  it('flags a deleted test file and a removed test case', () => {
    expect(kinds('diff --git a/src/test/kotlin/FooTest.kt b/src/test/kotlin/FooTest.kt\ndeleted file mode 100644\n--- a/src/test/kotlin/FooTest.kt\n+++ /dev/null\n@@ -1,2 +0,0 @@\n-class FooTest\n-fun a() {}\n')).toEqual(['file-deleted']);
    expect(kinds(edit(T, [' class FooTest {', '-    @Test', '-    fun b() {}', ' }']))).toEqual(['test-removed']);
  });
  it('flags an assertion that cannot fail', () => {
    expect(kinds(edit(T, ['+    assertTrue(true)']))).toEqual(['trivial-assertion']);
    expect(kinds(edit('web/a.test.ts', ['+  expect(true).toBe(true);']))).toEqual(['trivial-assertion']);
  });
  it('accepts adding a test, strengthening an assertion, reordering and changing production code', () => {
    expect(kinds(edit(T, ['+    @Test', '+    fun c() { assertEquals(2, g()) }']))).toEqual([]);
    expect(kinds(edit(T, ['-    assertNotNull(f())', '+    assertEquals(1, f())']))).toEqual([]);
    expect(kinds(edit(T, ['-    assertEquals(1, f())', '-    assertEquals(2, g())', '+    assertEquals(2, g())', '+    assertEquals(1, f())']))).toEqual([]);
    expect(kinds(edit('src/main/kotlin/Foo.kt', ['-    assertEquals(1, f())', '+    skipThis()']))).toEqual([]);
  });
  it('accepts moving a test between hunks of the same count', () => {
    expect(kinds(edit(T, ['-    @Test', '-    fun b() {}', '+    @Test', '+    fun b() { check() }']))).toEqual([]);
  });
});

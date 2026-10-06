// "Test not weakened between base and head": reads the diff and reports every way a patch can make a test
// easier to pass instead of making the code right: assertions removed or loosened, tests skipped,
// disabled or deleted, and assertions that cannot fail. Heuristic by design, so it errs toward flagging.
import type { DiffFile } from '../parse/diff';

export interface Weakening {
  file: string;
  kind: 'file-deleted' | 'removed-assertion' | 'loosened-assertion' | 'skip-added' | 'test-removed' | 'trivial-assertion';
  detail: string;
}

const TEST_PATH = [
  /(^|\/)(tests?|__tests__|spec|specs)\//,
  /(^|\/)src\/(test|androidTest|integrationTest)\//,
  /(Test|Tests|Spec|IT)\.[A-Za-z]+$/,
  /\.(test|spec)\.[cm]?[jt]sx?$/,
  /_test\.(go|py|rb)$/,
  /(^|\/)test_[^/]+\.py$/,
];

export const isTestPath = (p: string): boolean => TEST_PATH.some((r) => r.test(p));

const ASSERTION =
  /\b(assert[A-Za-z]*|expect|verify|should[A-Za-z]*)\s*[(<.{]|\.(should|toBe\w*|toEqual|toStrictEqual|toContain|toMatch\w*|toThrow\w*|toHaveLength|isEqualTo|isNotNull|isInstanceOf|hasSize|contains\w*)\b|^\s*assert\s|\bt\.(Error|Errorf|Fatal|Fatalf)\(|\brequire\.\w+\(/;

const TRIVIAL = /\bassert(True|That)?\s*\(\s*true\s*\)|expect\(\s*true\s*\)\.toBe\(\s*true\s*\)|^\s*assert\s+True\s*$/;

const SKIP = /@Disabled\b|@Ignore\b|\bx(it|describe|test)\(|\b(it|test|describe)\.(skip|todo)\b|@pytest\.mark\.skip|\bpytest\.skip\(|\bt\.Skip(f|Now)?\(|\bassume(True|That)?\(\s*false\s*\)/;

const DECLARATION = /@Test\b|\b(it|test)\(\s*['"`]|\bdef test_|\bfunc Test\w+\(/;

/** 3 = exact value or typed failure, 2 = partial or type match, 1 = only truthiness or "did not blow up". */
export function strengthOf(line: string): number | null {
  if (!ASSERTION.test(line)) return null;
  if (TRIVIAL.test(line)) return 0;
  if (/\bassertFails\s*[({]/.test(line)) return 1; // "something failed", not what
  const thrown = /\b(?:assertThrows|assertFailsWith)\s*[(<]\s*([\w.]+)/.exec(line)?.[1];
  if (thrown && /^(java\.lang\.)?(Runtime)?(Exception|Throwable|Error)(\.class)?$/.test(thrown)) return 1;
  if (/\b(assertTrue|assertFalse|assertNotNull|isNotNull|toBeTruthy|toBeFalsy|toBeDefined|assertNotEquals|isNotEmpty)\b/.test(line)) return 1;
  if (/^\s*assert\s+[^=]*$/.test(line) && !/(==|!=| in | is )/.test(line)) return 1;
  if (/\b(toContain|toMatch\w*|contains\w*|startsWith|endsWith|isInstanceOf|assertIs|assertIsNot|toHaveLength|hasSize)\b/.test(line)) return 2;
  return 3;
}

const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();

export function findWeakening(files: readonly DiffFile[]): Weakening[] {
  const out: Weakening[] = [];
  for (const f of files) {
    if (!isTestPath(f.path) && !(f.oldPath && isTestPath(f.oldPath))) continue;
    if (f.status === 'deleted') {
      out.push({ file: f.path, kind: 'file-deleted', detail: 'test file deleted' });
      continue;
    }
    let declRemoved = 0;
    let declAdded = 0;
    for (const h of f.hunks) {
      const del = h.lines.filter((l) => l.kind === 'del').map((l) => norm(l.text));
      const add = h.lines.filter((l) => l.kind === 'add').map((l) => norm(l.text));
      declRemoved += del.filter((l) => DECLARATION.test(l)).length;
      declAdded += add.filter((l) => DECLARATION.test(l)).length;
      for (const l of add) {
        if (SKIP.test(l)) out.push({ file: f.path, kind: 'skip-added', detail: `added "${l}"` });
        else if (strengthOf(l) === 0) out.push({ file: f.path, kind: 'trivial-assertion', detail: `added "${l}" which cannot fail` });
      }
      const addLeft = [...add];
      const lost: string[] = [];
      for (const l of del) {
        if (strengthOf(l) === null) continue;
        const same = addLeft.indexOf(l);
        if (same !== -1) addLeft.splice(same, 1); // moved or reordered, not removed
        else lost.push(l);
      }
      const replacements = addLeft.filter((l) => strengthOf(l) !== null);
      lost.forEach((l, i) => {
        const r = replacements[i];
        if (r === undefined) out.push({ file: f.path, kind: 'removed-assertion', detail: `removed "${l}"` });
        else if ((strengthOf(r) ?? 0) < (strengthOf(l) ?? 0)) {
          out.push({ file: f.path, kind: 'loosened-assertion', detail: `"${l}" became weaker "${r}"` });
        }
      });
    }
    if (declRemoved > declAdded) out.push({ file: f.path, kind: 'test-removed', detail: `${declRemoved - declAdded} test case(s) removed` });
  }
  return out;
}

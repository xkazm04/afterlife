// inert.test.ts calls "the five server actions" from a list somebody keeps. The ground truth is the source: every module that
// starts with 'use server' exports public endpoints, and on the hosted replay each is an anonymous one. This test derives
// that set from src/ and fails when an endpoint is not called by inert.test.ts, so a sixth cannot ship unexercised.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(import.meta.dirname, '../../../..');

const stripComments = (text: string): string => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : sources(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && !p.includes(`${path.sep}__tests__${path.sep}`) ? [p] : [];
  });
}

/** The exported functions of every module whose first statement is the 'use server' directive. */
function serverActionsIn(root: string): string[] {
  return sources(root).flatMap((f) => {
    const code = stripComments(fs.readFileSync(f, 'utf8')).trimStart();
    if (!/^(['"])use server\1/.test(code)) return [];
    return [...code.matchAll(/export\s+async\s+function\s+(\w+)/g)].map((m) => m[1] as string);
  });
}

/** Actions whose name never appears as a call in `tested`. */
const uncalled = (actions: readonly string[], tested: string): string[] => actions.filter((a) => !new RegExp(`\\b${a}\\(`).test(stripComments(tested)));

describe('every server action is called by the replay-inertness guard', () => {
  const inert = fs.readFileSync(path.join(import.meta.dirname, 'inert.test.ts'), 'utf8');

  it('finds the endpoints this repo ships', () => {
    expect(serverActionsIn(SRC)).toEqual(expect.arrayContaining(['previewAction', 'confirmAction', 'repollAction', 'verifyArmAction', 'rereadSetupAction']));
  }, 120_000); // walks the whole src/ tree: seconds alone, past the 30 s default under a loaded full suite

  it('calls each of them', () => {
    expect(uncalled(serverActionsIn(SRC), inert)).toEqual([]);
  }, 120_000); // walks the whole src/ tree: seconds alone, past the 30 s default under a loaded full suite

  it('goes red for a sixth endpoint nobody called (seeded control)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'actions-'));
    try {
      fs.writeFileSync(path.join(dir, 'sixth.ts'), "'use server';\n// export async function ghost() {}\nexport async function sixthAction(x: unknown) { return x; }\n");
      fs.writeFileSync(path.join(dir, 'plain.ts'), 'export async function notAnEndpoint() {}\n');
      const found = serverActionsIn(dir);
      expect(found).toEqual(['sixthAction']);
      expect(uncalled(found, inert)).toEqual(['sixthAction']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  });
});

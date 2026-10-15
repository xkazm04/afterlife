// The engine's import closure: every source file reachable from an entry through relative imports, wherever it
// lives. This is what runs, so it is what the pin hashes (./version.ts). Packages (`yaml`, `node:*`) are outside
// the repo and left out. An import that does not resolve, or an alias like `@/x`, is refused: skipping it would
// silently shrink the pin.
import fs from 'node:fs';
import path from 'node:path';
import { EngineError } from './types';

// Static `import ... from 'x'`, `export ... from 'x'` and side-effect `import 'x'`, each starting a line, so a
// specifier quoted in a comment or a string is not read as an import. A dynamic import (outside comments) is refused.
const STATIC = /^[ \t]*(?:import|export)\b[^;'"]*?\bfrom\s*['"]([^'"]+)['"]|^[ \t]*import\s*['"]([^'"]+)['"]/gm;
const DYNAMIC = /\bimport\s*\(\s*[^)\s]/; // an import(...) call that has an argument
const COMMENTS = /\/\*[\s\S]*?\*\/|\/\/.*$/gm;

function isPackage(spec: string): boolean {
  if (spec.startsWith('node:')) return true;
  return /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*(?:\/.*)?$/i.test(spec);
}

function resolve(from: string, spec: string, root: string): string {
  const base = path.resolve(path.dirname(from), spec);
  for (const p of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (/\.tsx?$/.test(p) && fs.statSync(p, { throwIfNoEntry: false })?.isFile()) return p;
  }
  throw new EngineError(`engine pin: cannot resolve '${spec}' imported by ${rel(root, from)}`);
}

const rel = (root: string, file: string) => path.relative(root, file).split(path.sep).join('/');

/** Sorted, root-relative ('/'-separated) paths of `entry` and everything it imports, transitively. */
export function importClosure(root: string, entry: string): string[] {
  const seen = new Set<string>();
  const todo = [path.resolve(root, entry)];
  for (let file = todo.pop(); file !== undefined; file = todo.pop()) {
    if (seen.has(file)) continue;
    seen.add(file);
    const text = fs.readFileSync(file, 'utf8');
    if (DYNAMIC.test(text.replace(COMMENTS, ''))) throw new EngineError(`engine pin: ${rel(root, file)} uses a dynamic import(), which the pin cannot follow`);
    for (const m of text.matchAll(STATIC)) {
      const spec = (m[1] ?? m[2])!;
      if (spec.startsWith('.')) todo.push(resolve(file, spec, root));
      else if (!isPackage(spec)) throw new EngineError(`engine pin: '${spec}' imported by ${rel(root, file)} is not a relative path; aliases are not followed`);
    }
  }
  return [...seen].map((f) => rel(root, f)).sort();
}

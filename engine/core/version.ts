// The engine pins itself: a verdict carries {version, sha256 of the engine source}, so anyone can tell
// which checker produced it. Tests and fixtures are not part of the checker and are left out.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ENGINE_VERSION = '1.0.0';

const ENGINE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== '__fixtures__' && e.name !== '__tests__') sourceFiles(p, out);
    } else if (e.name.endsWith('.ts') && !e.name.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

let cached: string | undefined;

/** sha256 over each source file's relative path and its content, with line endings normalised. */
export function engineSha256(root: string = ENGINE_ROOT): string {
  if (root === ENGINE_ROOT && cached) return cached;
  const files = sourceFiles(root)
    .map((f) => path.relative(root, f).split(path.sep).join('/'))
    .sort();
  const h = createHash('sha256');
  for (const rel of files) {
    h.update(`${rel}\0`);
    h.update(fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n'));
    h.update('\0');
  }
  const digest = h.digest('hex');
  if (root === ENGINE_ROOT) cached = digest;
  return digest;
}

export function engineInfo(): { version: string; sha256: string } {
  return { version: ENGINE_VERSION, sha256: engineSha256() };
}

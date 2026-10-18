// The engine pins itself: a verdict carries {version, sha256 of the engine source}, so anyone can tell
// which checker produced it. The source is the import closure of engine/cli.ts (./imports.ts): every file
// that runs, including the rules it imports from src/schemas, and nothing that merely sits in the folder.
// Tests and fixtures are not imported by the checker, so they are not part of it.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importClosure } from './imports';

export const ENGINE_VERSION = '1.0.0';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENTRY = 'engine/cli.ts';

export interface PinTarget {
  root: string; // paths in the pin are relative to it
  entry: string; // root-relative
}

const isDefault = (t: Partial<PinTarget>) => (t.root ?? REPO_ROOT) === REPO_ROOT && (t.entry ?? ENTRY) === ENTRY;
let cached: { files: string[]; sha256: string } | undefined;

function pin(t: Partial<PinTarget>): { files: string[]; sha256: string } {
  if (isDefault(t) && cached) return cached;
  const root = t.root ?? REPO_ROOT;
  const files = importClosure(root, t.entry ?? ENTRY);
  // sha256 over each file's root-relative path and its content, with line endings normalised.
  const h = createHash('sha256');
  for (const rel of files) {
    h.update(`${rel}\0`);
    h.update(fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n'));
    h.update('\0');
  }
  const out = { files, sha256: h.digest('hex') };
  if (isDefault(t)) cached = out;
  return out;
}

/** The pinned files: repo-relative, sorted. */
export function engineFiles(t: Partial<PinTarget> = {}): string[] {
  return [...pin(t).files];
}

export function engineSha256(t: Partial<PinTarget> = {}): string {
  return pin(t).sha256;
}

export function engineInfo(): { version: string; sha256: string } {
  return { version: ENGINE_VERSION, sha256: engineSha256() };
}

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

// A stray cp1252 byte (an ellipsis, a curly quote) makes a source file invalid UTF-8.
// Turbopack reads source as UTF-8, and the merge gate never runs a build, so this is the gate.

const ROOT = process.cwd();
const EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.mjs', '.js', '.css', '.md', '.json', '.yml', '.yaml']);
const FALLBACK_DIRS = ['src', 'engine', 'cli', 'gitlab', 'scripts', 'uat'];

function walk(dir: string, out: string[]): void {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (name === 'node_modules' || name === '.git') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(relative(ROOT, full).split(sep).join('/'));
  }
}

function listFiles(): string[] {
  try {
    const out = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return out.split('\0').filter(Boolean);
  } catch {
    const files: string[] = [];
    for (const d of FALLBACK_DIRS) walk(join(ROOT, d), files);
    return files;
  }
}

/** 1-based line of the first byte that is not valid UTF-8, or 0 when the buffer decodes. */
function firstBadLine(buf: Buffer): number {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  try {
    decoder.decode(buf);
    return 0;
  } catch {
    // fall through to locate the line
  }
  let start = 0;
  let line = 1;
  while (start <= buf.length) {
    let end = buf.indexOf(0x0a, start);
    if (end < 0) end = buf.length;
    try {
      decoder.decode(buf.subarray(start, end));
    } catch {
      return line;
    }
    start = end + 1;
    line += 1;
  }
  return 1;
}

describe('source encoding', () => {
  it('every tracked text file decodes as strict UTF-8', () => {
    const bad: string[] = [];
    for (const file of listFiles()) {
      if (!EXTENSIONS.has(extname(file).toLowerCase())) continue;
      let buf: Buffer;
      try {
        buf = readFileSync(join(ROOT, file));
      } catch {
        continue; // tracked but deleted in the working tree
      }
      const line = firstBadLine(buf);
      if (line > 0) bad.push(`${file}:${line} is not valid UTF-8`);
    }
    expect(bad.join('\n')).toBe('');
  });
});

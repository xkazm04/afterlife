#!/usr/bin/env node
// Structure gate (owner rule, 2026-10-06): every source file <= 200 lines, every folder <= 10 files
// (sub-folders do not count; nest instead). Run: node scripts/check-structure.mjs [root=src]
import fs from 'node:fs';
import path from 'node:path';

const MAX_LINES = 200;
const MAX_FILES = 10;
const EXT = /\.(tsx?|mts|mjs|js|css)$/;
const root = path.resolve(process.argv[2] ?? 'src');
const problems = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile());
  if (files.length > MAX_FILES) {
    problems.push(`${path.relative(process.cwd(), dir)}/ has ${files.length} files (max ${MAX_FILES}) - nest into sub-folders`);
  }
  for (const f of files) {
    if (!EXT.test(f.name)) continue;
    const p = path.join(dir, f.name);
    const lines = fs.readFileSync(p, 'utf8').split('\n').length;
    if (lines > MAX_LINES) problems.push(`${path.relative(process.cwd(), p)} has ${lines} lines (max ${MAX_LINES})`);
  }
  for (const d of entries.filter((e) => e.isDirectory())) walk(path.join(dir, d.name));
}

// A mistyped root (package.json names three) is a broken gate, not a size problem: say so and exit 2.
if (!fs.statSync(root, { throwIfNoEntry: false })?.isDirectory()) {
  console.error(`structure: ${path.relative(process.cwd(), root) || '.'} is not a directory`);
  process.exit(2);
}
walk(root);
if (problems.length) {
  console.error(`structure: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`structure: ok (${path.relative(process.cwd(), root) || '.'}: files <= ${MAX_LINES} lines, folders <= ${MAX_FILES} files)`);

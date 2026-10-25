// Append-only JSONL files, read through a cache keyed by path and re-used while mtime and size are unchanged (as in
// src/server/runs/readRuns.ts). A line that does not parse, or fails the row check, is skipped and COUNTED; a
// missing file is simply no rows. Appends with a `key` are idempotent: a key already on disk, or twice in one batch,
// is written once.
import { appendFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname } from 'node:path';

interface Parsed { mtimeMs: number; size: number; rows: unknown[]; skipped: number }
const cache = new Map<string, Parsed>();

/** Every valid row of the file, in file order, with the count of lines that were not. */
export function readJsonl<T>(path: string, valid: (v: unknown) => v is T): { rows: T[]; skipped: number } {
  let st;
  try {
    st = statSync(path);
  } catch {
    cache.delete(path);
    return { rows: [], skipped: 0 };
  }
  const hit = cache.get(path);
  if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return { rows: hit.rows as T[], skipped: hit.skipped };
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    cache.delete(path);
    return { rows: [], skipped: 1 };
  }
  const rows: T[] = [];
  let skipped = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let v: unknown;
    try {
      v = JSON.parse(line);
    } catch {
      skipped += 1;
      continue;
    }
    if (valid(v)) rows.push(v);
    else skipped += 1;
  }
  cache.set(path, { mtimeMs: st.mtimeMs, size: st.size, rows, skipped });
  return { rows, skipped };
}

function write(path: string, rows: unknown[]): void {
  if (!rows.length) return;
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, rows.map((r) => `${JSON.stringify(r)}\n`).join(''), 'utf8');
}

/** Appends the rows whose key is not stored yet; returns how many were new. */
export function appendKeyed<T extends { key: string }>(path: string, rows: T[], valid: (v: unknown) => v is T): number {
  const seen = new Set(readJsonl(path, valid).rows.map((r) => r.key));
  const fresh: T[] = [];
  for (const r of rows) {
    if (seen.has(r.key)) continue;
    seen.add(r.key);
    fresh.push(r);
  }
  write(path, fresh);
  return fresh.length;
}

/** Appends one line as is (adjustments: a claim and its later measurements share an id by design). */
export function appendRow(path: string, row: unknown): void {
  write(path, [row]);
}

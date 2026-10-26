// --ideas: the lens-scan store read read-only (a fixture scan.db built here), the checkout scan's R0/unknown cells,
// the capped prompt section, and a propose wave that shows them to the planner and records the counts in wave.plan.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { IDEAS_HEADING, gatherIdeas, parseIdeaSources, renderIdeas, type Idea } from '../../ideas';
import { checkoutScanIdeas } from '../../ideas/checkoutScan';
import { bodyGist, lensScanFile, lensScanIdeas } from '../../ideas/lensScan';
import { FAKE, makeFleet, runOne, type TempFleet } from './repo';

interface Db {
  exec(sql: string): void;
  prepare(sql: string): { run(...p: unknown[]): unknown };
  close(): void;
}
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as { DatabaseSync: new (file: string) => Db };

let f: TempFleet;
const rows: [string, string, string | null, number | null, string][] = [
  // id, status, size, tier, title
  ['p-done', 'done', 'S', 0, 'Already landed'],
  ['p-declined', 'declined', 'S', 0, 'Refused'],
  ['p-big', 'proposed', 'XL', null, 'Split the huge tab'],
  ['p-small', 'proposed', 'S', null, 'Guard the null total'],
  ['p-yes', 'approved', 'M', null, 'Allow-list the chat tools'],
  ['p-sev', 'proposed', 'L', 1, 'Stop leaking the token'],
  ['p-redo', 'rework', 'M', null, 'Retry the export'],
];

beforeAll(() => {
  f = makeFleet('afterlife-ideas-');
  const file = lensScanFile(f.repoDir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('CREATE TABLE proposals (id TEXT PRIMARY KEY, feature TEXT, lens TEXT, title TEXT, body TEXT, size TEXT, risk INTEGER, tier INTEGER, status TEXT, created_at TEXT)');
  const put = db.prepare('INSERT INTO proposals VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const [id, status, size, tier, title] of rows) put.run(id, 'billing', 'security', title, `## Summary\nshort ${id}\n## Description\napp/${id}.py:12 does it wrong\n## Flow\nfix`, size, 3, tier, status, '2026-10-01');
  db.close();
  process.env.AFTERLIFE_CLAUDE_BIN = FAKE;
});
afterAll(() => {
  delete process.env.AFTERLIFE_CLAUDE_BIN;
  fs.rmSync(f.tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

describe('the lens-scan source', () => {
  it('reads only open proposals, severity first, then a yes, then the smaller size', () => {
    const ideas = lensScanIdeas(f.repoDir);
    expect(ideas.map((i) => i.ref)).toEqual(['p-sev', 'p-yes', 'p-redo', 'p-small', 'p-big']);
    expect(ideas[0]).toMatchObject({ source: 'lens-scan', title: 'Stop leaking the token', tags: ['security/billing', 'L', 'tier 1', 'proposed'], detail: 'app/p-sev.py:12 does it wrong' });
  });

  it('touches no file of a store with no WAL, and still reads rows a live writer holds only in its WAL', () => {
    const file = lensScanFile(f.repoDir);
    const before = fs.readdirSync(path.dirname(file)).sort();
    const mtime = fs.statSync(file).mtimeMs;
    expect(lensScanIdeas(f.repoDir)).toHaveLength(5);
    expect(fs.readdirSync(path.dirname(file)).sort()).toEqual(before);
    expect(fs.statSync(file).mtimeMs).toBe(mtime);
    const wal = path.join(f.tmp, 'wal', '.ai', 'lens-scan', 'scan.db');
    fs.mkdirSync(path.dirname(wal), { recursive: true });
    const w = new DatabaseSync(wal);
    try {
      w.exec("PRAGMA journal_mode=WAL; CREATE TABLE proposals (id TEXT, feature TEXT, lens TEXT, title TEXT, body TEXT, size TEXT, risk INTEGER, tier INTEGER, status TEXT, created_at TEXT); INSERT INTO proposals VALUES ('p-w', 'f', 'l', 'In the WAL', '', 'S', 1, NULL, 'proposed', 'x')");
      expect(fs.statSync(`${wal}-wal`).size).toBeGreaterThan(0);
      expect(lensScanIdeas(path.join(f.tmp, 'wal')).map((i) => i.ref)).toEqual(['p-w']);
    } finally {
      w.close();
    }
  });

  it('a repo with no store has no ideas, and the store is not created', () => {
    expect(lensScanIdeas(f.tmp)).toEqual([]);
    expect(fs.existsSync(lensScanFile(f.tmp))).toBe(false);
  });

  it("takes a body's description, else its summary", () => {
    expect(bodyGist('## Summary\nonly this\n')).toBe('only this');
    expect(bodyGist('plain text\nhere')).toBe('plain text here');
  });
});

describe('the section', () => {
  it('names each source, stays under the cap and counts what it could not show', () => {
    const many: Idea[] = Array.from({ length: 40 }, (_, n) => ({ source: 'lens-scan', ref: `p-${n}`, tags: [], title: `item ${n}`, detail: 'x'.repeat(300) }));
    const r = renderIdeas([{ source: 'scan', ref: 'verify', tags: ['R0 absent'], title: 'verify stage', detail: 'no test job' }, ...many]);
    expect(r.text.startsWith(IDEAS_HEADING)).toBe(true);
    expect(Buffer.byteLength(r.text)).toBeLessThanOrEqual(6 * 1024);
    expect(r.text).toContain('- [scan verify · R0 absent] verify stage: no test job');
    const shown = r.counts.find((c) => c.source === 'lens-scan')?.count ?? 0;
    expect(r.text).toContain(`(${40 - shown} more not shown`);
    expect(r.counts[0]).toEqual({ source: 'scan', count: 1 });
    expect(renderIdeas([])).toEqual({ text: '', counts: [] });
  });

  it('parses the flag strictly', () => {
    expect(parseIdeaSources('lens-scan,scan,scan')).toEqual(['scan', 'lens-scan']);
    expect(parseIdeaSources('scan,lint')).toBeNull();
    expect(parseIdeaSources('')).toBeNull();
  });

  it("gathers the checkout scan's absent and unknown stages, each with its why", () => {
    const cells = checkoutScanIdeas(f.repoDir);
    expect(cells.length).toBeGreaterThan(0);
    for (const c of cells) expect(c).toMatchObject({ source: 'scan', tags: [expect.stringMatching(/^(R0 absent|unknown)$/)], detail: expect.any(String) });
    expect(gatherIdeas(['scan', 'lens-scan'], { checkout: f.repoDir, repoPath: f.repoDir }).filter((i) => i.source === 'lens-scan')).toHaveLength(5);
  });
});

describe('a wave with --ideas', () => {
  it('shows the planner the section and records what each source put in it', async () => {
    const r = await runOne(f, ['ok-a'], { mode: 'propose', ideas: ['scan', 'lens-scan'] });
    const prompt = r.calls[0]?.prompt ?? '';
    expect(prompt).toContain(IDEAS_HEADING);
    expect(prompt).toContain('[lens-scan p-sev · security/billing · L · tier 1 · proposed] Stop leaking the token');
    expect(prompt).not.toContain('Already landed');
    const plan = r.lines.find((e) => e.kind === 'wave.plan');
    expect(plan).toMatchObject({ ideas: [{ source: 'scan', count: expect.any(Number) }, { source: 'lens-scan', count: 5 }] });
  }, 90_000);
});

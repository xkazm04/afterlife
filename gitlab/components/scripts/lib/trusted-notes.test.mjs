// trustedNotes used to read at most 500 notes: a bot block older than that was never seen. It now pages until the
// caller stops, and an unreadable page or a runaway MR is an error, never "no trusted note".
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-notes-'));
let trustedNotes;

// A glab double that serves `total` notes, 100 a page, newest first; notes.json marks which ids the bot wrote.
const FAKE = `
import fs from 'node:fs';
const argv = process.argv.slice(2);
const cfg = JSON.parse(fs.readFileSync(${JSON.stringify(path.join(dir, 'cfg.json'))}, 'utf8'));
const q = new URLSearchParams(argv.at(-1).split('?')[1]);
const page = Number(q.get('page'));
fs.appendFileSync(${JSON.stringify(path.join(dir, 'calls.log'))}, page + String.fromCharCode(10));
if (page === cfg.failAt) { console.error('boom'); process.exit(1); }
const rows = [];
for (let i = (page - 1) * 100; i < Math.min(page * 100, cfg.total); i++) {
  rows.push({ id: i, system: false, created_at: 'x', author: { username: cfg.bot.includes(i) ? 'belay-bot' : 'mallory' }, body: 'n' + i });
}
process.stdout.write(JSON.stringify(rows));
`;

const configure = (cfg) => {
  fs.writeFileSync(path.join(dir, 'cfg.json'), JSON.stringify({ failAt: 0, bot: [], ...cfg }));
  fs.writeFileSync(path.join(dir, 'calls.log'), '');
};
const pagesFetched = () => fs.readFileSync(path.join(dir, 'calls.log'), 'utf8').split('\n').filter(Boolean).length;

beforeAll(async () => {
  fs.writeFileSync(path.join(dir, 'fake.mjs'), FAKE);
  process.env.BELAY_GLAB = `${process.execPath}|${path.join(dir, 'fake.mjs')}`;
  ({ trustedNotes } = await import('./lib.mjs'));
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('trustedNotes', () => {
  it('reaches a bot note beyond note 500', () => {
    configure({ total: 900, bot: [730] });
    const found = [...trustedNotes('1', '7', 'belay-bot')];
    expect(found.map((n) => n.id)).toEqual([730]);
  });

  it('stops paging once the caller has what it wants', () => {
    configure({ total: 900, bot: [3, 730] });
    for (const n of trustedNotes('1', '7', 'belay-bot')) {
      expect(n.id).toBe(3);
      break;
    }
    expect(pagesFetched()).toBe(1);
  });

  it('is empty when nobody trusted wrote anything, after reading every page', () => {
    configure({ total: 250, bot: [] });
    expect([...trustedNotes('1', '7', 'belay-bot')]).toEqual([]);
    expect(pagesFetched()).toBe(3);
  });

  it('fails closed when a page cannot be read', () => {
    configure({ total: 900, bot: [730], failAt: 4 });
    expect(() => [...trustedNotes('1', '7', 'belay-bot')]).toThrow();
  });
});

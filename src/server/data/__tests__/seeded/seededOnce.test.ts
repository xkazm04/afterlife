// The live "own decisions only" rule is written once (ownDecisions); no screen loader filters on isSeeded itself.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.tsx?$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });
const app = sources(join(process.cwd(), 'src/app')).map((p) => ({ p, s: strip(readFileSync(p, 'utf8')) }));

describe('the seeded filter is one implementation', () => {
  it('no screen under src/app filters on isSeeded itself', () => {
    expect(app.filter(({ s }) => /!\s*isSeeded\(/.test(s)).map((f) => f.p)).toEqual([]);
  });
  it('the four screens that list decisions call ownDecisions', () => {
    const users = app.filter(({ s }) => /\bownDecisions\(/.test(s)).map((f) => f.p.replaceAll('\\', '/').split('src/app/features/')[1]);
    expect(users.sort()).toEqual(['door/data/loadDoorData.ts', 'fleet/data/loadFleetData.ts', 'monitor/data/loadMonitorData.ts', 'needs-you/data/pick.ts']);
  });
});

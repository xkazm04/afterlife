import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { demoSource } from '@/server/data/demoSource';
import { Answer } from '../components/ui/Answer';
import { COUNT_END } from '../hooks/useCountUp';
import { INTRO_MS } from '../hooks/useDoor';
import { HOME, cityTransform, frameDistrict, groundTransform } from './camera';
import { groundOf } from './ground';
import { districtsOf, FB, GHOST_H, paintOrder, towerH, UNKNOWN_H } from './city';
import { beamsOf, districtGlows, towerShape, towerTop } from './shapes';
import { activeMark, dimSet, escapeStep, redSet, toggleLock } from './filter';
import { cutawayOf } from './cutaway';
import { stageFit, stageFitSource } from './fit';
import { districtLine, fleetTotals, projectLine, staleText, topTiers, waitWords } from './words';

const fleet = demoSource.getFleet();
const ds = districtsOf(fleet.groups, fleet.projects);

describe('the city', () => {
  it('places every project once, four districts in front and three behind', () => {
    expect(ds.reduce((a, d) => a + d.placed.length, 0)).toBe(fleet.projects.length);
    expect(ds.filter((d) => d.cy === 748)).toHaveLength(4);
    expect(ds.filter((d) => d.cy === 486)).toHaveLength(3);
    for (const d of ds) expect(new Set(d.placed.map((t) => `${t.i},${t.j}`)).size).toBe(d.placed.length);
  });
  it('paints back to front and puts the most decisions at the front', () => {
    const d = ds[0]!;
    const order = paintOrder(d);
    expect(order[0]!.i + order[0]!.j).toBeLessThanOrEqual(order[order.length - 1]!.i + order[order.length - 1]!.j);
    expect(d.placed[0]!.p.needsYou).toBe(Math.max(...d.placed.map((t) => t.p.needsYou)));
  });
  it('lights one beam per waiting project and a glow per district that waits', () => {
    const waiting = fleet.projects.filter((p) => p.state !== 'not-set-up' && p.needsYou > 0);
    expect(beamsOf(ds)).toHaveLength(waiting.length);
    expect(districtGlows(ds).length).toBe(ds.filter((d) => d.needs > 0).length);
  });
  it('stands an unwatched tower, and an unread one, at the one ghost height', () => {
    const t = ds.flatMap((d) => d.placed).find((x) => x.p.state === 'not-set-up')!;
    const top = -Math.min(...towerShape(t, fleet.classes).hit.split(' ').map((q) => Number(q.split(',')[1]))) - FB;
    expect([towerTop(t), top, UNKNOWN_H]).toEqual([GHOST_H, GHOST_H, GHOST_H]);
  });
  it('draws a tower in about ten nodes: windows of a tier share a path', () => {
    const t = ds[0]!.placed.find((x) => x.p.state === 'watching')!;
    const s = towerShape(t, fleet.classes);
    expect(Object.keys(s.windows).length).toBeLessThanOrEqual(6);
    expect(s.faces).toBeDefined();
    const ghost = ds.flatMap((d) => d.placed).find((x) => x.p.state === 'not-set-up')!;
    expect(towerShape(ghost, fleet.classes).kind).toBe('nsu');
  });
  it('a tower whose armed tracks were not read stands at the unknown height, dashed, never the bare zero tower', () => {
    const t = ds[0]!.placed.find((x) => x.p.state === 'watching')!;
    const unread = { ...t, p: { ...t.p, armed: null }, h: towerH({ ...t.p, armed: null }) };
    expect([unread.h, towerH({ ...t.p, armed: 0 })]).toEqual([UNKNOWN_H, 11]);
    expect(towerShape(unread, fleet.classes).heightUnknown).toBe(true);
    expect(towerShape(t, fleet.classes).heightUnknown).toBeUndefined();
  });
  it('builds the ground as a handful of paths, the same every time', () => {
    const a = groundOf();
    expect(a).toEqual(groundOf());
    expect(a.pulses.length).toBeLessThanOrEqual(8);
    expect(a.vias.match(/M/g)!.length).toBe(340);
  });
});

describe('words and camera', () => {
  it('answers with the fleet counts', () => {
    expect(fleetTotals(fleet.projects)).toMatchObject({ n: 184, needs: 115, stale: 11, setup: 9, nsu: 9, watch: 155, quar: 25 });
    expect(topTiers(fleet.projects)[0]).toEqual({ n: 6, names: ['gateway-service', 'gateway-web'] });
  });
  it('says stale and unknown in words', () => {
    const stale = fleet.projects.find((p) => p.id === 'docs-portal')!;
    expect(projectLine(stale)[0]).toEqual(['stale · project token expired · last good poll 47 min ago', 'stale']);
    const nsu = fleet.projects.find((p) => p.state === 'not-set-up')!;
    expect(projectLine(nsu)).toEqual([['not watched · unknown, not zero', 'unknown']]);
    expect(districtLine(ds[0]!).map((p) => p[0]).join('')).toContain('decisions wait');
  });
  it('frames a district inside the stage and moves the ground at half speed', () => {
    const c = frameDistrict(ds[0]!);
    expect(c.k).toBeGreaterThan(1);
    expect(c.k).toBeLessThanOrEqual(3);
    expect(cityTransform(HOME)).toBe('translate(0.00px, 0.00px) scale(1.0000)');
    expect(groundTransform({ ...HOME, k: 3 })).toContain('scale(2.0000)');
  });
});

describe('the legend as a filter', () => {
  it('locks a mark on click, lets it go on the same click, and the lock outranks the hover', () => {
    expect(toggleLock(null, 'quar')).toBe('quar');
    expect(toggleLock('quar', 'quar')).toBeNull();
    expect(toggleLock('quar', 'stale')).toBe('stale');
    expect(activeMark(null, 'stale')).toBe('stale');
    expect(activeMark('quar', 'stale')).toBe('quar');
    expect(activeMark(null, null)).toBeNull();
  });
  it('lets Escape clear the lock before it climbs a level', () => {
    expect(escapeStep('quar')).toBe('unlock');
    expect(escapeStep(null)).toBe('up');
  });
  it('dims what the mark does not light, and reddens only the quarantined', () => {
    expect(dimSet(null, fleet.projects)).toBeNull();
    const stale = dimSet('stale', fleet.projects)!;
    expect(stale.size).toBe(fleet.projects.length - 11);
    expect(stale.has('docs-portal')).toBe(false);
    expect(redSet('stale', fleet.projects)).toBeNull();
    const red = redSet('quar', fleet.projects)!;
    expect(red.size).toBeGreaterThan(0);
    expect([...red].every((id) => !dimSet('quar', fleet.projects)!.has(id))).toBe(true);
  });
});

describe('copy that counts: one is singular', () => {
  const watching = fleet.projects.find((p) => p.state === 'watching')!;
  const lineOf = (needsYou: number) => districtLine(districtsOf(['g'], [{ ...watching, group: 'g', needsYou }])[0]!).map((x) => x[0]).join('');
  it('says "1 decision waits" and "2 decisions wait" in the district line', () => {
    expect(lineOf(1)).toBe('1 project · 1 decision waits');
    expect(lineOf(2)).toBe('1 project · 2 decisions wait');
    expect(lineOf(0)).toBe('1 project · 0 decisions wait');
  });
  const html = (over: Partial<ReturnType<typeof fleetTotals>>) => {
    const totals = { ...fleetTotals([]), ...over };
    const props = { totals, tiers: [], staleTop: null, cycles: { projects: 0, gained: 0 }, intro: false, tabbable: true, locked: null, onMark: () => undefined, onLock: () => undefined, onOpen: () => undefined };
    return renderToString(createElement(Answer, props));
  };
  const answer = (over: Partial<ReturnType<typeof fleetTotals>>) => {
    return html(over).replace(/<[^>]*>/g, '');
  };
  it('says the waits in one wording: the district line, the big number and its subtitle', () => {
    for (const n of [0, 1, 2]) expect([html({ needs: n }), answer({ needs: n }), lineOf(n)].map((t) => t.includes(waitWords(n)))).toEqual([true, true, true]);
    expect(html({ needs: 1 })).toContain('aria-label="1 decision waits for you.');
  });
  it('says "1 class quarantined" and "1 proof passed" in the answer block', () => {
    expect(answer({ quar: 1, pass: 1 })).toContain('1 class quarantined');
    expect(answer({ quar: 1, pass: 1 })).toContain('1 proof passed this week');
    expect(answer({ quar: 25, pass: 40 })).toContain('25 classes quarantined');
    expect(answer({ quar: 25, pass: 40 })).toContain('40 proofs passed this week');
  });
  it('paints the failed count in the failure colour only when something failed, as the readout does', () => {
    const failed = (fail: number) => /<span class="[^"]+">\d+<\/span> (<!-- -->)?failed/.test(html({ fail }));
    expect([failed(0), failed(3)]).toEqual([false, true]);
    expect(projectLine({ ...watching, proofs7d: { pass: 2, fail: 0, inconclusive: 0 } }).at(-1)).toEqual(['0 fail', 'plain']);
  });
});

describe('the stale feed says the same thing in the readout and on the tower', () => {
  const stale = fleet.projects.find((p) => p.id === 'docs-portal')!;
  const withFeed = (error: string | undefined) => ({ ...stale, feed: { ageSec: 2820, ok: false, ...(error === undefined ? {} : { error }) } });
  const cases: [string | undefined, string, string[]][] = [
    ['project token expired', 'project token expired · last good poll 47 min ago', ['feed stale', 'project token expired', 'last good poll 47 min ago']],
    ['rate limited · 3 min ago', 'rate limited · 3 min ago', ['feed stale', 'rate limited', '3 min ago']],
    [undefined, 'last good poll 47 min ago', ['feed stale', 'last good poll 47 min ago']],
    // "ago" inside a word is not an age: the host still needs its last good poll
    ['502 from gitlab.paragon.dev', '502 from gitlab.paragon.dev · last good poll 47 min ago', ['feed stale', '502 from gitlab.paragon.dev', 'last good poll 47 min ago']],
  ];
  it.each(cases)('error %j', (error, text, lines) => {
    expect(staleText(withFeed(error))).toBe(text);
    expect(cutawayOf(withFeed(error), fleet.classes, []).tag.lines).toEqual(lines);
  });
  it('never says stale twice: "stale · last good poll", not "stale · feed stale · ..."', () => {
    expect(projectLine(withFeed(undefined))[0]![0]).toBe('stale · last good poll 47 min ago');
    expect(staleText({ ...withFeed(undefined), feed: { ageSec: null, ok: false } })).toBe('no error recorded');
  });
});

describe('the stage fit: the inline script before paint and the resize hook agree', () => {
  const run = (w: number, h: number) => {
    const vars: Record<string, string> = {};
    const doc = { documentElement: { style: { setProperty: (k: string, v: string) => (vars[k] = v) }, dataset: {} } };
    new Function('innerWidth', 'innerHeight', 'document', 'location', 'localStorage', stageFitSource())(w, h, doc, { search: '' }, { getItem: () => null, setItem: () => undefined });
    return vars;
  };
  it.each([[1920, 1080], [1600, 1000], [1366, 768], [390, 844], [2560, 1600]])('%i x %i', (w, h) => {
    expect(stageFit(w, h)).toEqual(run(w, h));
  });
});

describe('the intro outlasts the count-ups', () => {
  it('INTRO_MS is not below the moment the last count finishes', () => {
    expect(INTRO_MS).toBeGreaterThanOrEqual(COUNT_END);
  });
  it('Answer takes every count schedule from useCountUp, none by literal', () => {
    const src = readFileSync(new URL('../components/ui/Answer.tsx', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/delay=\{\d/);
  });
});

describe('the cutaway draws a floor per stage, as the L2 panel counts rungs', () => {
  const p = fleet.projects.find((x) => x.state === 'watching')!;
  it.each([9, 10])('%i stages, a floor each', (n) => {
    const stages = Array.from({ length: n }, (_, i) => `s${i}`);
    const c = cutawayOf({ ...p, stages: Array(n).fill(1) }, fleet.classes, stages);
    expect(c.floors.map((f) => f.label.name)).toEqual(stages.map((s) => s.replace(/^./, (x) => x.toUpperCase())));
    expect(c.floors.every((f) => f.rung === 1)).toBe(true);
  });
});

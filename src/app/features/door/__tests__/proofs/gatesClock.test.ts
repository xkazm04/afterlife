// The gates run on one clock written twice: GatesEntrance's timers (GATES_MS) and the stylesheets' durations. A beat
// retimed in one language only opens the gates before the lock has turned, or ends the overlay mid-swing.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GATES_MS } from '../../components/entrance/gates/GatesEntrance';

const dir = '../../components/entrance/gates/';
const read = (f: string) => readFileSync(new URL(`${dir}${f}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const gates = read('gates.module.css');
const block = (sel: string) => {
  const at = gates.indexOf(`\n${sel} {`);
  return at < 0 ? '' : gates.slice(at, gates.indexOf('}', at));
};
const ms = (text: string, re: RegExp) => Number(re.exec(text)?.[1]);

describe('the gates keep one clock in the script and the stylesheets', () => {
  it('the swing lengths are the --g-sw the leaves swing for: full, fast, lite', () => {
    expect(ms(block('.root'), /--g-sw:\s*(\d+)ms/)).toBe(GATES_MS.swing);
    expect(ms(block('.root[data-gp="fast"]'), /--g-sw:\s*(\d+)ms/)).toBe(GATES_MS.swingFast);
    expect(ms(block(':global(html[data-door-q="lite"]) .root:not([data-gp="fast"])'), /--g-sw:\s*(\d+)ms/)).toBe(GATES_MS.swingLite);
  });
  it('the fail-safe drops the overlay at the script fail-safe time', () => {
    expect(ms(block('.root'), /animation:\s*failsafe\s+(\d+)ms/)).toBe(GATES_MS.failsafe);
  });
  it('the clock and every beat on it run for the open time', () => {
    expect(ms(block('.clock'), /animation:\s*clock\s+(\d+)ms/)).toBe(GATES_MS.open);
    const beats = ['gates', 'inlay', 'knot', 'leaf', 'light'].flatMap((f) =>
      [...read(`${f}.module.css`).matchAll(/animation:\s*(\w+)\s+(\d+)ms\s+both;/g)].map((m) => [`${f}:${m[1]}`, Number(m[2])] as const),
    );
    expect(beats.length).toBeGreaterThanOrEqual(18);
    for (const [beat, d] of beats) expect(d, beat).toBe(GATES_MS.open);
  });
});

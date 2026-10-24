import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GATES_MS } from '../../components/entrance/gates/GatesEntrance';

const dir = '../../components/entrance/gates/';
const css = readFileSync(new URL(`${dir}gates.module.css`, import.meta.url), 'utf8');
const tsx = readFileSync(new URL(`${dir}GatesEntrance.tsx`, import.meta.url), 'utf8');
const rule = (sel: string) => {
  const at = css.indexOf(`
${sel} {`);
  return at < 0 ? '' : css.slice(at, css.indexOf('}', at));
};

/** Ways the server-painted overlay leaves with no client script: a CSS-only timer on the root, which the script cancels. */
describe('the entrance gates do not outlive a page whose script never runs', () => {
  it('the root carries a CSS fail-safe that drops the overlay and its pointer events, later than the ceremony', () => {
    const m = /animation:\s*failsafe\s+(\d+)ms/.exec(rule('.root'));
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(GATES_MS.open + GATES_MS.swing + 40 + 1000);
    const kf = /@keyframes failsafe\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(kf).toMatch(/visibility:\s*hidden/);
    expect(kf).toMatch(/pointer-events:\s*none/);
  });
  it('the script wins: once hydrated it marks the root live and the fail-safe is off', () => {
    expect(rule('.root[data-live]')).toMatch(/animation:\s*none/);
    expect(tsx).toMatch(/dataset\.live/);
  });
});

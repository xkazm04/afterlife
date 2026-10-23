// The detail page's "Ready to sign" is off until the draft is read, and says why, as the band's twin button does
// (BandSide.test.tsx): a disabled button is not focusable, so its title is the only place the reason can live.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../../data/pick';
import { initialState } from '../../../model/state';
import { InspCra } from './InspCra';

const demo = pickNeedsYouDemo();
const base = initialState(demo);
const html = (draft: boolean) => renderToStaticMarkup(<InspCra s={{ ...base, read: { ...base.read, draft } }} demo={demo} leftSec={0} dispatch={() => {}} />);

describe('InspCra', () => {
  it('open: Ready to sign is disabled with the reason until the draft is read', () => {
    expect(html(false)).toMatch(/<button[^>]*disabled=""[^>]*title="Read the draft first[^"]*"[^>]*>Ready to sign/);
    const read = html(true);
    expect(read).toContain('Ready to sign');
    expect(read).not.toContain('Read the draft first');
  });
});

describe('InspCra evidence ticks', () => {
  it('each tick says it resolves, as the band strip\'s ticks do', () => {
    const ticks = [...html(false).matchAll(/<span[^>]*>✓<\/span>/g)].map((m) => m[0]);
    expect(ticks.length).toBeGreaterThan(0);
    for (const t of ticks) expect(t).toMatch(/role="img"[^>]*aria-label="resolves"/);
  });
});

describe('InspCra deadlines', () => {
  const at = (leftSec: number) => renderToStaticMarkup(<InspCra s={base} demo={demo} leftSec={leftSec} dispatch={() => {}} />);
  it('the 72 h line moves with the 24 h clock (leftSec + 48 h)', () => {
    expect(at(19 * 3600 + 12 * 60)).toContain('in 2 d 19 h 12 m');
    expect(at(18 * 3600 + 12 * 60)).toContain('in 2 d 18 h 12 m');
    expect(at(18 * 3600 + 12 * 60)).not.toContain('in 2 d 19 h 12 m');
  });
});

describe('InspCra grade', () => {
  const grade = (linksResolved: string) =>
    renderToStaticMarkup(<InspCra s={base} demo={{ ...demo, signoff: { ...demo.signoff, linksResolved } }} leftSec={0} dispatch={() => {}} />).match(/Grade<span class="[^"]*">([^<]*)</)?.[1];
  it('reads reviewable when every link resolves and draft when one does not', () => {
    expect(grade('6 / 6')).toBe('reviewable');
    expect(grade('5 / 6')).toBe('draft');
  });
});

// The tripwire commit is one fact (READMIT.tripwire): the page path and the timeline row read it, nothing retypes it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { READMIT } from '../../../data/readmit';
import { pickNeedsYouDemo } from '../../../data/pick';
import { initialState } from '../../../model/state';
import { InspReadmit } from '../items/InspReadmit';

const code = (rel: string) =>
  readFileSync(join(__dirname, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('InspReadmit tripwire', () => {
  it('the page path and the timeline both carry READMIT.tripwire', () => {
    const demo = pickNeedsYouDemo();
    const out = renderToStaticMarkup(<InspReadmit s={{ ...initialState(demo), sel: 'n4' }} demo={demo} leftSec={0} dispatch={() => {}} />);
    expect(out).toContain(`tripwire ${READMIT.tripwire} ·`);
    expect(READMIT.timeline[0]?.[2]).toContain(READMIT.tripwire);
  });

  it('the hash is typed once, in data/readmit.ts', () => {
    const sites = [code('../items/InspReadmit.tsx'), code('../../../data/readmit.ts')].map((src) => src.split(READMIT.tripwire).length - 1);
    expect(sites).toEqual([0, 1]);
  });
});

describe('InspReadmit record at the trip', () => {
  it('counts reverts in words that agree with the number', () => {
    const demo = pickNeedsYouDemo();
    const at = (reverts: number) =>
      renderToStaticMarkup(<InspReadmit s={{ ...initialState(demo), sel: 'n4', read: { draft: false, note: true } }} demo={{ ...demo, record: { ...demo.record, reverts } }} leftSec={0} dispatch={() => {}} />);
    expect(at(1)).toContain('· 1 revert<');
    expect(at(2)).toContain('· 2 reverts<');
    expect(at(0)).toContain('· 0 reverts<');
  });
});

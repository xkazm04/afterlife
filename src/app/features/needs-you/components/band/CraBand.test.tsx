// The band's grade ladder names the rung the packet is on; a link that does not resolve keeps it at draft.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { pickNeedsYouDemo } from '../../data/pick';
import { initialState } from '../../model/state';
import { CraBand } from './CraBand';

const s = initialState(pickNeedsYouDemo());
const current = (linksResolved: string) => {
  const out = renderToStaticMarkup(<CraBand s={s} linksResolved={linksResolved} dispatch={() => {}} />);
  return [...out.matchAll(/>(draft|reviewable|ready to sign)<span[^>]*> \(current\)/g)].map((m) => m[1]);
};

describe('CraBand grade', () => {
  it('is on reviewable when every link resolves and on draft when one does not', () => {
    expect(current('6 / 6')).toEqual(['reviewable']);
    expect(current('5 / 6')).toEqual(['draft']);
  });
});

// A passed legal deadline reads overdue, as the task page does, never a frozen "time left 00h 00m 00s".
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClockText } from '../table/ClockText';
import { Countdown } from './Countdown';

let left = 0;
vi.mock('../../hooks/ClockProvider', () => ({ useLeftSec: () => left }));

describe('the CRA clock at its deadline', () => {
  beforeEach(() => {
    left = 0;
  });
  it('band: reads overdue at zero and time left before it', () => {
    const out = renderToStaticMarkup(<Countdown signed={false} />);
    expect(out).toContain('aria-label="overdue"');
    expect(out).toContain('overdue</span>');
    left = 61;
    const live = renderToStaticMarkup(<Countdown signed={false} />);
    expect(live).toContain('aria-label="time left"');
    expect(live).not.toContain('overdue');
  });
  it('rows: say overdue at zero and the clock before it', () => {
    expect(renderToStaticMarkup(<ClockText />)).toBe('overdue');
    left = 3661;
    expect(renderToStaticMarkup(<ClockText />)).toBe('01:01:01');
  });
});

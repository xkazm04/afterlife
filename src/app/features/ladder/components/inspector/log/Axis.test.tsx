// The to-scale axis's title says how long the rail spans in a unit a person reads: a rail can run up to a day.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { LedgerEntry } from '../../../model/types';
import { Axis } from './Axis';

const at = (ms: number, t: string): LedgerEntry => ({ at: ms, t, ids: ['a'], actor: 'gitlab job', where: 'MR', kind: 'gitlab', text: '' });

describe('the axis title', () => {
  it('a rail of two hours reads "2 h", not "7200 s"', () => {
    const out = renderToStaticMarkup(<Axis events={[at(0, '12:00:00'), at(7_200_000, '14:00:00')]} />);
    expect(out).toContain('title="to scale: 2 h from first to last"');
  });
  it('a rail of seconds still reads in seconds', () => {
    expect(renderToStaticMarkup(<Axis events={[at(0, '12:00:00'), at(12_000, '12:00:12')]} />)).toContain('title="to scale: 12 s from first to last"');
  });
});

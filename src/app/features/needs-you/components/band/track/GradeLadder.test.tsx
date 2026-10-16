// The grade ladder as a screen reader meets it: which rung the packet is on, which are behind it and which is struck out
// must be in text or an ARIA attribute, not only in a colour and a line.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GradeLadder } from './GradeLadder';

const chips = (current: number) => {
  const out = renderToStaticMarkup(<GradeLadder current={current} />);
  return out.split(/(?=<span class="[^"]*" title=)/).slice(1);
};

describe('the grade ladder chips', () => {
  it('each carry their state in text or aria-current', () => {
    const rungs = chips(1);
    expect(rungs).toHaveLength(4);
    const named = rungs.filter((c) => /aria-current|\((current|done|not reached|never said by Belay)\)/.test(c));
    expect(named).toHaveLength(4);
  });

  it('name the current rung once and the struck-out rung as never said', () => {
    const joined = chips(1).join('');
    expect(joined.match(/aria-current|\(current\)/g)).toHaveLength(1);
    expect(joined).toContain('never said by Belay');
  });
});

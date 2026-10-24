// The quoted hunk wears the "seeded" chip only when its task is seeded (a planted demo fault), never on every hunk.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { loadTasks } from '../../model/build/loadTasks';
import { Exhibits } from './Exhibits';

const SEEDED_TITLE = 'title="Seeded fault: planted on purpose for the demo"';
const withHunk = loadTasks().find((t) => t.hunk);

describe('the hunk exhibit', () => {
  it('a demo task has a hunk to draw, and it is the seeded changelog (so the demo keeps its chip)', () => {
    expect(withHunk?.hunk).toBeTruthy();
    expect(withHunk?.seeded).toBe(true);
  });
  it.each([true, false])('seeded %s: the chip is drawn only when the task is seeded', (seeded) => {
    if (!withHunk) throw new Error('no task with a hunk');
    const out = renderToStaticMarkup(createElement(Exhibits, { task: { ...withHunk, seeded } }));
    expect(out).toContain(withHunk.hunk?.head ?? '@@');
    expect(out.includes(SEEDED_TITLE)).toBe(seeded);
  });
});

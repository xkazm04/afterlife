// A data-source task carries its CRA clock but never a fixture's awareAt, and its grade and resolved links are optional:
// the clock exhibit must say "not held" for each, not print "aware ", an empty grade and "links /".
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Exhibits } from '../components/inspector/Exhibits';
import { loadTasks } from '../model/build/loadTasks';

const withClock = loadTasks().find((t) => t.clock && t.awareAt && t.grade && t.linksResolved)!;
const bare = { ...withClock, awareAt: null, grade: null, linksResolved: null };
const text = (task: typeof withClock) => renderToStaticMarkup(createElement(Exhibits, { task })).replace(/<[^>]+>/g, '');

describe('the clock exhibit', () => {
  it('a fixture task shows its aware time, grade and resolved links', () => {
    const t = text(withClock);
    expect(t).toContain(`aware ${withClock.awareAt}`);
    expect(t).toContain(`links ${withClock.linksResolved![0]}/${withClock.linksResolved![1]}`);
  });
  it('a task that holds none of them says so for each', () => {
    const t = text(bare);
    expect(t).not.toMatch(/links \//);
    expect(t).toContain('aware not held');
    expect(t).toContain('grade not held');
    expect(t).toContain('links not held');
  });
  it('a passed deadline reads overdue, never "overdue left of"', () => {
    const t = text({ ...withClock, clock: { ...withClock.clock!, dueIn: 'overdue' } });
    expect(t).not.toContain('overdue left of');
    expect(t).toContain(`overdue · ${withClock.clock!.total} clock`);
  });
});

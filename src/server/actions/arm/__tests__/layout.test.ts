// A block list under include: may sit at the key's own indent ("include:\n- local: a.yml"), which YAML allows and many
// pipelines use. insertBlock answered ok for it at a two-space indent that no longer parsed, so the plan refused with
// "could not add ... without breaking it". The block now takes the list's own indent, and disarm still removes exactly it.
import { describe, expect, it } from 'vitest';
import { findBlock, insertBlock, removeBlock } from '../block';
import { holdsBlock } from '../checks';
import { DEMO_PIN } from '../config';
import { armOf } from '../content';

const T4 = armOf('T4')!;
const AT = { 'proof-engine': 'review' };
const wanted = T4.includes(DEMO_PIN, AT);
const arm = (text: string) => insertBlock(text, T4, 'acme-lab', DEMO_PIN, AT);

describe('insertBlock into an include: list', () => {
  it.each([
    ['indented', 'include:\n  - local: a.yml\nstages: [review]\n'],
    ['at the key\'s own indent', 'include:\n- local: a.yml\nstages: [review]\n'],
    ['at the key\'s own indent, last in the file', 'stages: [review]\ninclude:\n- local: a.yml\n- local: b.yml'],
  ])('%s: the result parses, holds every component, and disarm restores the file byte for byte', (_name, text) => {
    const r = arm(text);
    if (!r.ok) throw new Error(r.reason);
    expect(holdsBlock(r.content, wanted)).toBe(true);
    expect(findBlock(r.content, T4)).toMatchObject({ state: 'armed' });
    const back = removeBlock(r.content, T4);
    expect(back.ok && back.content).toBe(text);
  });

  it('writes the block at the list\'s own indent', () => {
    const r = arm('include:\n- local: a.yml\n');
    expect(r.ok && r.added[1]).toMatch(/^- component: /);
    const s = arm('include:\n  - local: a.yml\n');
    expect(s.ok && s.added[1]).toMatch(/^ {2}- component: /);
  });

  it('still refuses what it would have to rewrite', () => {
    expect(arm('include: a.yml\n')).toMatchObject({ ok: false, reason: expect.stringMatching(/one line/) });
    expect(arm('include:\n  local: a.yml\n')).toMatchObject({ ok: false, reason: expect.stringMatching(/not a list/) });
  });
});

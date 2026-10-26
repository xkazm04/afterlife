// The wire renders every step state from the shared StartView fixtures (the same ones Focus uses): nothing probed,
// checking with its elapsed seconds and the light flowing into it, slow, blocked at login, the stack probing, all done.
import { readFileSync } from 'node:fs';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { VIEWS } from '../../../model/fixtures/views';

vi.mock('next/link', () => ({ default: (p: { href: string; children: ReactNode }) => createElement('a', { href: p.href }, p.children) }));
const { WireVariant } = await import('../WireVariant');

const html = (v: (typeof VIEWS)[keyof typeof VIEWS]) => renderToStaticMarkup(createElement(WireVariant, { view: v }));
const tabs = (out: string) => out.match(/role="tab"/g)?.length ?? 0;
const segs = (out: string, s: string) => out.match(new RegExp(`data-seg="${s}"`, 'g'))?.length ?? 0;

describe('Wire', () => {
  it('nothing probed: eight tabs in three bands, the repo drawer open under it, waiting for you', () => {
    const out = html(VIEWS.nothing);
    expect(tabs(out)).toBe(8);
    expect(out).toContain('role="tablist"');
    expect(out.match(/data-first="true"/g)).toHaveLength(3);
    expect(out).toMatch(/aria-selected="true"[^>]*aria-expanded="true"[^>]*aria-label="1\. Pick a repo, this machine: waits for you"/);
    expect(out).toContain('role="tabpanel"');
    expect(out).toContain('pick a repo you work in with Claude Code');
    expect(out).toContain('Use this path');
    expect(segs(out, 'lit')).toBe(0);
  });

  it('checking: the light flows into each checking node and the drawer says what it checks, with seconds', () => {
    const out = html(VIEWS.checking);
    expect(segs(out, 'flow')).toBeGreaterThan(0);
    expect(out).toContain('aria-label="checking now"');
    expect(out).toContain('checking glab… 4 s');
    expect(out).not.toContain('still waiting');
  });

  it('slow: from 12 s on it names what it is still waiting on', () => {
    expect(html(VIEWS.slow)).toMatch(/checking glab login… 14 s<span[^>]*> · still waiting on GitLab/);
  });

  it('blocked at login: the node says blocked, the drawer holds Run it, Copy command and the command', () => {
    const out = html(VIEWS.blocked);
    expect(out).toMatch(/data-state="blocked"[^>]*aria-selected="true"/);
    expect(out).toContain('glab is not logged in to gitlab.com');
    expect(out).toContain('Run it');
    expect(out).toContain('Copy command');
    expect(out).toContain('glab auth login');
  });

  it('the stack probing: its drawer opens under it with the checklist on its line', () => {
    const out = html(VIEWS.probing);
    expect(out).toContain('What to watch');
    expect(out).toContain('checking line 2 of 6');
    expect(out).toMatch(/--at:5/);
  });

  it('all done: every node done, seven segments lit, the unlock map opens', () => {
    const out = html(VIEWS.done);
    expect(out.match(/aria-label="done"/g)?.length).toBeGreaterThanOrEqual(8);
    expect(segs(out, 'lit')).toBe(7);
    expect(out).toContain('href="/setup"');
  });

  it('copy budget: no paragraph beyond StepBody on the stage', () => {
    const out = html(VIEWS.nothing).replace(/<div[^>]*role="tabpanel"[\s\S]*$/, '');
    expect(out).not.toContain('<p');
  });

  it('reduced motion stops the travelling light, the sweep and the slide', () => {
    for (const f of ['seg', 'drawer', 'wire']) {
      const css = readFileSync(new URL(`../${f}.module.css`, import.meta.url), 'utf8');
      const rm = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
      expect(rm.length, f).toBeGreaterThan(40);
      if (f !== 'wire') expect(rm).toContain('animation: none');
    }
  });
});

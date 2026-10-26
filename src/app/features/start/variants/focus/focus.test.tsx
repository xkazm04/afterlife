// Focus renders every step state from the shared StartView fixtures: nothing probed (the repo waits for you), checking
// with its elapsed seconds, slow, blocked at login with Run it and the command, the stack probing, and all done.
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { VIEWS } from '../../model/fixtures/views';

vi.mock('next/link', () => ({ default: (p: { href: string; children: ReactNode }) => createElement('a', { href: p.href }, p.children) }));
const { FocusVariant } = await import('./FocusVariant');

const html = (v: (typeof VIEWS)[keyof typeof VIEWS]) => renderToStaticMarkup(createElement(FocusVariant, { view: v }));
const dots = (out: string) => out.match(/<button type="button" class="[^"]*dot/g)?.length ?? 0;

describe('Focus', () => {
  it('nothing probed: one dot per step, the repo step on stage waiting for you, with its picker', () => {
    const out = html(VIEWS.nothing);
    expect(dots(out)).toBe(8);
    expect(out).toContain('1 of 8 · this machine');
    expect(out).toContain('Pick a repo');
    expect(out).toContain('data-state="you"');
    expect(out).toContain('pick a repo you work in with Claude Code');
    expect(out).toContain('Use this path');
  });

  it('checking: the step breathes and says what it checks, with the elapsed seconds', () => {
    const out = html(VIEWS.checking);
    expect(out).toContain('glab installed');
    expect(out).toContain('aria-label="checking now"');
    expect(out).toContain('checking glab… 4 s');
    expect(out).not.toContain('still waiting');
  });

  it('slow: from 12 s on it names what it is still waiting on', () => {
    expect(html(VIEWS.slow)).toMatch(/checking glab login… 14 s<span[^>]*> · still waiting on GitLab/);
  });

  it('blocked at login: the doctor’s line, Run it and Copy command, and the command itself', () => {
    const out = html(VIEWS.blocked);
    expect(out).toContain('data-state="blocked"');
    expect(out).toContain('glab is not logged in to gitlab.com');
    expect(out).toContain('Run it');
    expect(out).toContain('Copy command');
    expect(out).toContain('glab auth login');
    expect(out).toContain('What this checks');
  });

  it('the stack probing: on stage on its own, its checking line names the line it is on', () => {
    const out = html(VIEWS.probing);
    expect(out).toContain('What to watch');
    expect(out).toContain('checking line 2 of 6');
    expect(out).toMatch(/data-current="true"[^>]*aria-current="step"/);
  });

  it('all done: the unlock map opens, every dot is done and each connector is lit', () => {
    const out = html(VIEWS.done);
    expect(out).toContain('Unlock map');
    expect(out).toContain('href="/setup"');
    expect(out.match(/aria-label="done"/g)?.length).toBeGreaterThanOrEqual(8);
    expect(out.match(/data-lit="true"/g)).toHaveLength(7);
  });
});

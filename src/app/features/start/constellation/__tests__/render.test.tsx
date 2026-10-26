// Constellation renders every step state from the shared StartView fixtures: the orbit (a node per step, a link whose
// look says its state), the caption under it with nothing open, and a step's card grown from its node.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { VIEWS } from '../../model/fixtures/views';
import type { StartView } from '../../model/view';
import { starsOf } from '../sky';

vi.mock('next/link', () => ({ default: (p: { href: string; children: ReactNode }) => createElement('a', { href: p.href }, p.children) }));
const { ConstellationVariant } = await import('../ConstellationVariant');
const { StepCard } = await import('../StepCard');

const html = (v: StartView) => renderToStaticMarkup(createElement(ConstellationVariant, { view: v }));
const card = (v: StartView, key = v.selected) => {
  const star = starsOf(v.steps).find((s) => s.step.key === key)!;
  return renderToStaticMarkup(createElement(StepCard, { view: v, step: star.step, from: star.pct, closing: false, onClose: () => {}, onClosed: () => {} }));
};
const nodes = (out: string) => out.match(/<button[^>]*data-key="/g)?.length ?? 0;
const links = (out: string, kind: string) => out.match(new RegExp(`data-link="${kind}"`, 'g'))?.length ?? 0;

describe('Constellation', () => {
  it('nothing probed: a node per step, the repo node current and amber, the caption says what is next', () => {
    const out = html(VIEWS.nothing);
    expect(nodes(out)).toBe(8);
    expect(out).toMatch(/data-current="true" data-key="repo"[^>]*aria-label="1 of 8, Pick a repo: waits for you"/);
    expect(links(out, 'you')).toBe(1);
    expect(out).toContain('Next: </span><strong>Pick a repo</strong> · pick a repo you work in with Claude Code');
    expect(out).not.toContain('role="dialog"');
    for (const p of ['this machine', 'GitLab', 'Afterlife']) expect(out).toContain(`>${p}</span>`);
  });

  it('checking: each checking node breathes, its link flows, and the caption says what it checks with the seconds', () => {
    const out = html(VIEWS.checking);
    const checking = VIEWS.checking.steps.filter((s) => s.state === 'checking').length;
    expect(checking).toBeGreaterThan(0);
    expect(links(out, 'flow')).toBe(checking);
    expect(out.match(/class="[^"]*ring/g)).toHaveLength(checking);
    expect(out).toContain('aria-label="2 of 8, glab installed: checking now"');
    expect(out).toContain('checking glab… 4 s');
    expect(out).not.toContain('still waiting');
  });

  it('slow: the caption and the card name what they are still waiting on from 12 s', () => {
    expect(html(VIEWS.slow)).toContain('still waiting on this machine');
    expect(card(VIEWS.slow)).toMatch(/checking glab login… 14 s<span[^>]*> · still waiting on GitLab/);
  });

  it('blocked at login: a broken link, and its card holds the doctor’s line, Run it, the command', () => {
    expect(links(html(VIEWS.blocked), 'broken')).toBe(1);
    const out = card(VIEWS.blocked);
    expect(out).toContain('role="dialog"');
    expect(out).toContain('aria-modal="true"');
    expect(out).toContain('Signed in');
    expect(out).toContain('glab is not logged in to gitlab.com');
    expect(out).toContain('Run it');
    expect(out).toContain('Copy command');
    expect(out).toContain('glab auth login');
    expect(out).toContain('Fold Signed in back into the orbit');
  });

  it('the card grows out of its node: the node’s spot is its transform origin', () => {
    const star = starsOf(VIEWS.blocked.steps).find((s) => s.step.key === 'login')!;
    expect(card(VIEWS.blocked)).toContain(`--nx:${star.pct.x};--ny:${star.pct.y}`);
  });

  it('the stack probing: its node is current, and the caption names the line it is on', () => {
    const out = html(VIEWS.probing);
    expect(out).toMatch(/data-current="true" data-key="stack"/);
    expect(out).toContain('checking line 2 of 6');
    expect(card(VIEWS.probing)).toContain('What to watch');
  });

  it('all done: every link solid, no "Next", and the unlock card opens the map', () => {
    const out = html(VIEWS.done);
    expect(links(out, 'solid')).toBe(8);
    expect(out).not.toContain('Next: ');
    expect(out).toContain('<strong>Unlock map</strong>');
    expect(card(VIEWS.done, 'unlock')).toContain('href="/setup"');
  });

  it('reduced motion stops the flow and the grow', () => {
    const css = (f: string) => readFileSync(path.join(import.meta.dirname, '..', f), 'utf8');
    expect(css('sky.module.css')).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*\.flow \{\s*animation: none/);
    expect(css('card.module.css')).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*animation: none/);
  });
});

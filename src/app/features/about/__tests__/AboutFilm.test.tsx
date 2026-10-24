// The film's first render (the server's, and hydration's): the intro over the scene, one station and one timeline stop
// per beat of the loop, the plain "Stylised illustration" label (no data-mode pill), the way into the app, where Esc
// leads (back to the door from ?from=door, else into the app), and the Theater hand-off only on the last beat.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO } from '@/lib/demo';
import { AboutFilm } from '../AboutFilm';
import { Caption } from '../components/Caption';
import type { AboutData } from '../model/beats';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children?: unknown }) => createElement('a', { href, ...rest }, children as never),
}));
const nav = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(nav.search) }));

const beats = DEMO.loop.map(({ key, label, stage, who, text }) => ({ key, label, stage, who, text }));
const demo: AboutData = { beats };
const html = (d: AboutData) => renderToString(createElement(AboutFilm, { data: d }));
/** The one link that carries Esc, as rendered. */
const escLink = (h: string) => h.match(/<a [^>]*aria-keyshortcuts="Escape"[^>]*>[^<]*<\/a>/g) ?? [];

describe('AboutFilm', () => {
  beforeEach(() => {
    nav.search = '';
  });

  it('opens on the intro with its skip', () => {
    const h = html(demo);
    expect(h).toContain('Watch one change travel from a finding to production.');
    expect(h).toContain('Nobody clicks.');
    expect(h).toContain('Skip intro · any key');
  });

  it('draws a station and a timeline stop for every beat of the loop', () => {
    const h = html(demo);
    beats.forEach((b, i) => {
      expect(h).toContain(`Beat ${i + 1} of ${beats.length}: ${b.label}`);
      expect(h).toContain(`${String(i + 1).padStart(2, '0')} · ${b.label.toUpperCase()}`);
    });
    expect(h).not.toMatch(/NaN|Infinity/);
  });

  it('labels the art "Stylised illustration" and nothing more: no data-mode pill', () => {
    const h = html(demo);
    expect(h).toContain('>Stylised illustration</span>');
    expect(h).not.toContain('about-mode');
    expect(h).not.toContain('illustrative demo data');
  });

  it('carries the header line, the breadcrumb and the way into the app', () => {
    const h = html(demo);
    expect(h).toContain('Eight AI agents on your GitLab group.');
    expect(h).toContain('Agents may act alone only where they can prove it.');
    expect(h).toMatch(/<a href="\/"[^>]*>Afterlife<\/a>.*About/);
    expect(h).toMatch(/<a href="\/fleet"[^>]*>Enter Afterlife<\/a>/);
    expect(h).not.toContain('Replay it step by step in Theater'); // not on the first beat
  });

  it('Esc enters the app by default: "Enter Afterlife" carries the shortcut', () => {
    const esc = escLink(html(demo));
    expect(esc).toHaveLength(1);
    expect(esc[0]).toContain('href="/fleet"');
  });

  it('Esc goes back to the door when the viewer came from it: the breadcrumb carries the shortcut', () => {
    nav.search = 'from=door';
    const esc = escLink(html(demo));
    expect(esc).toHaveLength(1);
    expect(esc[0]).toMatch(/href="\/"[^>]*>Afterlife</);
  });

  it('hands on to Theater on the last beat only', () => {
    const last = renderToString(createElement(Caption, { beat: beats[8]!, i: 8, n: 9, ghost: false, hidden: false }));
    expect(last).toContain('Replay it step by step in Theater');
    expect(last).toContain('href="/theater"');
    expect(renderToString(createElement(Caption, { beat: beats[8]!, i: 8, n: 9, ghost: true, hidden: false }))).not.toContain('Theater');
    expect(renderToString(createElement(Caption, { beat: beats[7]!, i: 7, n: 9, ghost: false, hidden: false }))).not.toContain('Theater');
  });

  it('plays a loop it was not drawn for', () => {
    const h = html({ beats: [{ key: 'new', label: 'Something new', stage: 'plan', who: 'T9', text: 'x' }] });
    expect(h).toContain('Beat 1 of 1: Something new');
  });
});

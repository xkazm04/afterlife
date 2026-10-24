// The film's first render (the server's, and hydration's): the intro over the scene, one station and one timeline stop
// per beat of the loop, the real mode on the pill, the way into the app, and the Theater hand-off only on the last beat.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DEMO } from '@/lib/demo';
import { AboutFilm } from '../AboutFilm';
import { Caption } from '../components/Caption';
import type { AboutData } from '../model/beats';

vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

const beats = DEMO.loop.map(({ key, label, stage, who, text }) => ({ key, label, stage, who, text }));
const demo: AboutData = { beats, mode: { mode: 'demo', label: 'illustrative demo data', beatsIllustrative: true } };
const html = (d: AboutData) => renderToString(createElement(AboutFilm, { data: d }));

describe('AboutFilm', () => {
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

  it('says the real mode: demo is illustrative demo data, live is the live label', () => {
    expect(html(demo)).toMatch(/data-role="about-mode"[^>]*>.*illustrative demo data/);
    const live = html({ beats, mode: { mode: 'live', label: 'live data · acme', beatsIllustrative: true } });
    expect(live).toContain('live data · acme');
    expect(live).not.toContain('illustrative demo data');
    expect(live).toContain('beats are illustrative, not your group');
  });

  it('carries the header line, the breadcrumb and the way into the app', () => {
    const h = html(demo);
    expect(h).toContain('Eight AI agents on your GitLab group.');
    expect(h).toContain('Agents may act alone only where they can prove it.');
    expect(h).toMatch(/<a href="\/">Afterlife<\/a>.*About/);
    expect(h).toContain('<a href="/fleet">Enter Afterlife</a>');
    expect(h).not.toContain('Replay it step by step in Theater'); // not on the first beat
  });

  it('hands on to Theater on the last beat only', () => {
    const last = renderToString(createElement(Caption, { beat: beats[8]!, i: 8, n: 9, ghost: false, hidden: false }));
    expect(last).toContain('Replay it step by step in Theater');
    expect(last).toContain('href="/theater"');
    expect(renderToString(createElement(Caption, { beat: beats[8]!, i: 8, n: 9, ghost: true, hidden: false }))).not.toContain('Theater');
    expect(renderToString(createElement(Caption, { beat: beats[7]!, i: 7, n: 9, ghost: false, hidden: false }))).not.toContain('Theater');
  });

  it('plays a loop it was not drawn for', () => {
    const h = html({ ...demo, beats: [{ key: 'new', label: 'Something new', stage: 'plan', who: 'T9', text: 'x' }] });
    expect(h).toContain('Beat 1 of 1: Something new');
  });
});

// The markup contracts every feature leans on and no test pinned: a button never submits a form by accident, a
// link-button is a real link, a checkbox and a toggle expose their state, an icon is decorative unless named, and a
// lozenge word stays in the DOM (its CSS only hides it from the eye).
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Icon } from '@/components/icons/Icon';
import { Button } from '../Button';
import { Checkbox } from '../Checkbox';
import { LozengeButton } from '../lozenge/LozengeButton';
import { ToolbarButton } from '../toolbar/ToolbarButton';

vi.mock('next/link', () => ({ default: (p: { href: string; className?: string; children?: unknown }) => createElement('a', { href: p.href, className: p.className }, p.children as never) }));

const html = (el: ReactElement): string => renderToStaticMarkup(el);

describe('Button', () => {
  it('is type="button" unless the caller says otherwise', () => {
    expect(html(createElement(Button, null, 'Go'))).toMatch(/^<button type="button"/);
    expect(html(createElement(Button, { type: 'submit' }, 'Go'))).toMatch(/^<button type="submit"/);
  });
  it('with href is a link in the same look, with no button left in it', () => {
    const out = html(createElement(Button, { href: '/fleet', variant: 'primary', size: 'mini' }, 'Open'));
    expect(out).toMatch(/^<a href="\/fleet" class="[^"]*btn[^"]*primary[^"]*mini[^"]*link/);
    expect(out).not.toContain('<button');
  });
});

describe('Checkbox', () => {
  const box = (checked: boolean, describedBy?: string) =>
    html(createElement(Checkbox, { checked, onChange: () => {}, label: 'Pick gap 1', describedBy, disabled: !!describedBy }));
  it('is a button with role checkbox and its state, named by its label', () => {
    expect(box(true)).toMatch(/^<button type="button" role="checkbox" aria-checked="true" aria-label="Pick gap 1"/);
    expect(box(false)).toContain('aria-checked="false"');
  });
  it('points a disabled box at its reason', () => {
    expect(box(false, 'why-1')).toMatch(/aria-describedby="why-1"[^>]*disabled/);
  });
});

describe('ToolbarButton', () => {
  it('is type="button" and states aria-pressed only when it is a toggle', () => {
    expect(html(createElement(ToolbarButton, null, 'x'))).not.toContain('aria-pressed');
    expect(html(createElement(ToolbarButton, { pressed: true }, 'x'))).toMatch(/^<button type="button" aria-pressed="true"/);
  });
});

describe('Icon', () => {
  it('is hidden from assistive tech unless it carries a label', () => {
    expect(html(createElement(Icon, { name: 'check' }))).toMatch(/aria-hidden="true"/);
    const named = html(createElement(Icon, { name: 'check', label: 'Done' }));
    expect(named).toMatch(/role="img" aria-label="Done"/);
    expect(named).not.toContain('aria-hidden');
  });
  it('sizes itself by the glyph box times --ui-scale', () => {
    expect(html(createElement(Icon, { name: 'check' }))).toContain('width:calc(11px * var(--ui-scale))');
  });
});

describe('LozengeButton', () => {
  it('keeps its word in the DOM, so it stays in the accessible name when the CSS folds it', () => {
    expect(html(createElement(LozengeButton, { count: 11, word: 'stale', pressed: false }))).toMatch(/aria-pressed="false"[^>]*>.*>11<.*>stale</);
  });
});

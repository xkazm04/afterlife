// The shared parts render their states: the pulse, the checking line (elapsed, then the slow note from 12 s), the chat
// drawer's turns with a reply's action card, and the action sheet's preview with Confirm.
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ActionPreview } from '@/server/actions/types';
import type { ChatView, PendingView } from '../../model/view';

vi.mock('next/link', () => ({ default: (p: { href: string; children: ReactNode }) => createElement('a', { href: p.href }, p.children) }));
const { CheckingLine } = await import('../CheckingLine');
const { StepPulse } = await import('../StepPulse');
const { ChatDrawer } = await import('../chat/ChatDrawer');
const { ActionSheet } = await import('../sheet/ActionSheet');

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const noop = () => {};

const PREVIEW: ActionPreview = {
  kind: 'set-setup' as ActionPreview['kind'], title: 'Set the group', summary: 'Writes the runtime settings and restarts the live runtime.', risk: 'low',
  commands: [], diff: ['- mode: demo', '+ mode: live', '+ groupId: 777'], notes: ['the env wins where it sets a value'], previewId: 'pv-1', mode: 'live',
};

describe('StepPulse', () => {
  it('says each state in words, and breathes only while checking', () => {
    expect(html(createElement(StepPulse, { state: 'checking' }))).toMatch(/aria-label="checking now".*class="[^"]*ring/);
    expect(html(createElement(StepPulse, { state: 'done' }))).toContain('✓');
    expect(html(createElement(StepPulse, { state: 'you' }))).toContain('aria-label="waits for you"');
    expect(html(createElement(StepPulse, { state: 'blocked' }))).not.toContain('ring');
  });
});

describe('CheckingLine', () => {
  it('shows what it checks and the elapsed seconds, as a status', () => {
    const out = html(createElement(CheckingLine, { checking: { what: 'glab login', sinceS: 4, on: 'GitLab' } }));
    expect(out).toContain('role="status"');
    expect(out).toContain('checking glab login… 4 s');
    expect(out).not.toContain('still waiting');
  });
  it('adds the slow note at 12 s, naming who it waits on', () => {
    expect(html(createElement(CheckingLine, { checking: { what: 'glab login', sinceS: 12, on: 'GitLab' } }))).toContain('still waiting on GitLab');
    expect(html(createElement(CheckingLine, { checking: { what: 'the proposal', sinceS: 30, on: 'the model' } }))).toContain('still waiting on the model');
  });
});

describe('ChatDrawer', () => {
  const chat: ChatView = {
    open: true, toggle: noop, ask: noop, propose: noop, thinking: true, elapsedS: 9,
    turns: [
      { role: 'you', text: 'do it for me' },
      { role: 'afterlife', text: 'Your repo names group 777. Confirm to watch it live.', action: { kind: 'set-setup', groupId: '777', mode: 'live' } },
    ],
  };
  it('renders the turns, the model’s as untrusted text with its action card, and the thinking seconds', () => {
    const out = html(createElement(ChatDrawer, { chat }));
    expect(out).toContain('Ask Afterlife');
    expect(out).toContain('do it for me');
    expect(out).toContain('Untrusted text from Afterlife’s model');
    expect(out).toContain('Watch group 777, live');
    expect(out).toContain('group 777 · live');
    expect(out).toContain('Review');
    expect(out).toContain('thinking… 9 s');
    expect(out).toContain('placeholder="Ask, or say “do it for me”"');
  });
  it('draws nothing while closed', () => {
    expect(html(createElement(ChatDrawer, { chat: { ...chat, open: false } }))).toBe('');
  });
});

describe('ActionSheet', () => {
  const pending: PendingView = { step: 'group', action: { kind: 'set-setup', groupId: '777', mode: 'live' }, title: 'Watch group 777, live', preview: { kind: 'preview', preview: PREVIEW }, busy: false, done: false, confirm: noop, cancel: noop };
  it('shows the preview, its notes, the settings diff and the risk, with Confirm', () => {
    const out = html(createElement(ActionSheet, { pending }));
    for (const s of ['Watch group 777, live', 'Writes the runtime settings', 'the env wins', '+ groupId: 777', 'risk low', 'Confirm', 'Cancel']) expect(out).toContain(s);
  });
  it('says while it asks, and why a refused one will not run', () => {
    expect(html(createElement(ActionSheet, { pending: { ...pending, preview: undefined } }))).toContain('Asking the server for the exact command');
    expect(html(createElement(ActionSheet, { pending: { ...pending, preview: { kind: 'refused', reason: 'the env sets AFTERLIFE_GROUP_ID' } } }))).toContain('Not sent: the env sets AFTERLIFE_GROUP_ID');
  });
});

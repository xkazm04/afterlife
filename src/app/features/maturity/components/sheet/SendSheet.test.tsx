// The Send sheet's title says what the sheet holds: the imperative while writes are ready, a receipt once all were sent.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { GapSheetApi } from '../../hooks/useGapSheet';
import type { SheetRow } from '../../write/sheet';
import { SendSheet } from './SendSheet';

const row = (id: string, done: boolean): SheetRow => ({
  id,
  title: `gap ${id}`,
  send: { ok: false, reason: 'not sent in this test' },
  ...(done ? { answer: { status: 'done' as const, text: `opened ${id}` } } : {}),
});

const titleOf = (rows: SheetRow[], ready: number): string => {
  const api: GapSheetApi = { rows, ready, sending: false, send: () => {}, retry: () => {} };
  const html = renderToStaticMarkup(createElement(SendSheet, { api, onClose: () => {} }));
  const m = /<h2[^>]*>(.*?)<\/h2>/.exec(html);
  if (!m) throw new Error(`no sheet title in: ${html.slice(0, 300)}`);
  return m[1] ?? '';
};

describe('SendSheet title', () => {
  it('is a receipt once every row is done and nothing is ready', () => {
    expect(titleOf([row('g1', true), row('g2', true)], 0)).toBe('Opened 2 MRs');
    expect(titleOf([row('g1', true)], 0)).toBe('Opened 1 MR');
  });
  it('counts only the ready rows while some are still to send', () => {
    expect(titleOf([row('g1', true), row('g2', false)], 1)).toBe('Open 1 MR as you');
    expect(titleOf([row('g1', false), row('g2', false)], 2)).toBe('Open 2 MRs as you');
  });
  it('says there is nothing to send when nothing is ready or done', () => {
    expect(titleOf([row('g1', false)], 0)).toBe('Nothing to send yet');
  });
});

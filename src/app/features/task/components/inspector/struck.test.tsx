// A struck check (decidedBy 'human') is open whatever its ok: the court card, its ruling and the claim's "Tested by" draw it
// as the equation term does ('?', "a person decides"), never as a hold or a fail.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { loadTasks } from '../../model/build/loadTasks';
import { Court } from '../court/Court';
import { SelectionRuling } from './SelectionRuling';

const q8 = loadTasks().find((t) => t.id === '01J8Q8')!;
const signed = { ...q8, proof: { ...q8.proof, checks: q8.proof.checks.map((c) => ({ ...c, decidedBy: 'human' as const })) } };
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(createElement(ToastProvider, null, el));

describe('a struck check', () => {
  it('draws on its court card as "?", never ✓ or ✗', () => {
    const court = html(createElement(Court, { task: signed, sel: null, rv: null, onPick: () => undefined }));
    expect(court).not.toMatch(/[✓✗]/);
    expect(court.match(/\?/g)?.length).toBeGreaterThanOrEqual(signed.proof.checks.length);
  });

  it('rules "a person decides" in the inspector, not "fails the verdict" or "holds"', () => {
    const ruling = html(createElement(SelectionRuling, { task: signed, sel: { side: 'check', id: 'envelope' } }));
    expect(ruling).toContain('a person decides');
    expect(ruling).not.toMatch(/fails the verdict|holds|[✓✗]/);
  });

  it('is listed under a claim\'s "Tested by" as "?", never ✓ or ✗', () => {
    const ruling = html(createElement(SelectionRuling, { task: signed, sel: { side: 'claim', id: 'c2' } }));
    expect(ruling).toContain('? tests-green');
    expect(ruling).not.toMatch(/[✓✗]/);
  });

  it('an engine check still draws by its ok', () => {
    expect(html(createElement(SelectionRuling, { task: q8, sel: { side: 'check', id: 'envelope' } }))).toContain('fails the verdict');
  });
});

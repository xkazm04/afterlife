// A Proof Block check names the claim it answers by id, and nothing upstream checks that the claim is in the block.
// The ruling on a check whose claim is not held must say so, not print an empty quotation.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '@/components/overlays/toast/ToastProvider';
import { SelectionRuling } from '../components/inspector/SelectionRuling';
import { loadTasks } from '../model/build/loadTasks';

const held = loadTasks().find((t) => t.proof.checks.some((c) => c.claims.length)) ?? loadTasks()[0]!;
const check = held.proof.checks.find((c) => c.claims.length) ?? held.proof.checks[0]!;
const dangling = { ...held, proof: { ...held.proof, checks: held.proof.checks.map((c) => (c.id === check.id ? { ...c, claims: ['c-missing'] } : c)) } };
const ruling = (task: typeof held) => renderToStaticMarkup(createElement(ToastProvider, null, createElement(SelectionRuling, { task, sel: { side: 'check', id: check.id } })));

describe('the ruling on a check whose claim is not held', () => {
  it('names the claim and says it is not in this proof, with no empty quotation', () => {
    const html = ruling(dangling);
    expect(html).toContain('c-missing');
    expect(html).not.toContain('“”');
    expect(html).toContain('not in this proof');
  });
  it('a held claim is still quoted', () => {
    const claim = held.claims.find((c) => c.id === check.claims[0])!;
    expect(ruling(held)).toContain(`“${claim.text}”`);
  });
});

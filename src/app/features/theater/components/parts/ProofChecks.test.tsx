import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CHECKS } from '../../data/constants';
import { REPLAY_LEDGER } from '../../data/ledger';
import { buildSnapshots } from '../../model/derive/snapshots';
import { ProofChecks } from '../stage/ProofChecks';

const html = (done: Parameters<typeof ProofChecks>[0]['done']) => renderToStaticMarkup(createElement(ProofChecks, { done }));

describe('ProofChecks on the stage', () => {
  it('lists all five checks as a static labelled list, with no live region', () => {
    const out = html([]);
    for (const c of CHECKS) expect(out).toContain(c);
    expect(out).toContain('aria-label="Proof checks on !41, illustrative replay"');
    expect(out).not.toContain('aria-live');
    expect(out).toContain('0 / 5');
  });
  it('ticks in with the replay snapshot and ends on PASS', () => {
    const snaps = buildSnapshots(REPLAY_LEDGER, []);
    const at = (seq: number) => snaps.find((s) => s.e.seq === seq)!;
    expect(html(at(490).checks)).toContain('0 / 5');
    expect(html(at(492).checks)).toContain('2 / 5');
    const last = html(at(495).checks);
    expect(last).toContain('>PASS</span></h3>');
  });
});

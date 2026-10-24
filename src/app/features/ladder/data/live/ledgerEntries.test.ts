// Live "Who acted" and "All moves" from the project's own belay-ledger: the moves a class page speaks of, in chain order,
// timed on the rail within a day, none marked demo. The fake's chain maps to its five moves.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { append, type LedgerEvent } from '@/schemas/ledger';
import { ledgerEvents } from '@/server/gitlab/fake/demo';
import { SEED_NOW } from '@/server/index/seed/parse';
import { LogItem } from '../../components/inspector/log/LogItem';
import { LEDGER_SEED } from '../ledgerSeed';
import { LIVE_LEDGER_MAX, liveLedgerEntries } from './ledgerEntries';

vi.mock('next/link', () => ({ default: (p: { href: string; children?: unknown }) => createElement('a', { href: p.href }, p.children as never) }));

describe('liveLedgerEntries', () => {
  it('maps the tier decision, the guardrail and proof verdicts and the merge; task starts and deployments are not moves', () => {
    const out = liveLedgerEntries(ledgerEvents(SEED_NOW), SEED_NOW, 'UTC');
    expect(out.map((e) => [e.ids, e.actor, e.text])).toEqual([
      [['dep-bump.patch'], 'proof job', 'proof verdict on !41'],
      [['dep-bump.patch'], 'guardrail job', 'pass on !41'],
      [['dep-bump.patch'], 'ai-patcher-acme-lab', '!41 merged at Hands-off'],
      [['patch-bump'], 'guardrail job', 'block on !44'],
      [['patch-bump'], 'tier-gate job', '!44 gated at Quarantined'],
    ]);
    expect(out.every((e) => e.kind === 'gitlab' && e.where === 'GitLab' && !e.demo)).toBe(true);
    expect(out.find((e) => e.text === 'block on !44')?.quoteMr).toBe('!44');
  });

  it('a decision states the revision it read and what the sweep withdrew', () => {
    const chain = ledgerEvents(SEED_NOW);
    const last = chain.at(-1)!;
    const e = append(chain, { ...last, subject: { ...last.subject, iid: 45 }, tier_at_time: 'supervised', state_rev: 'c1'.repeat(20), withdrew: ['approval', 'auto_merge'] } as Omit<LedgerEvent, 'seq' | 'prev_hash' | 'hash'>);
    expect(liveLedgerEntries([...chain, e], SEED_NOW, 'UTC').at(-1)?.text).toBe('!45 gated at Supervised · read tier-state.yml @ c1c1c1c1 · withdrew the approval and the auto-merge');
  });

  it('within a day it is a clock time on the rail; older, "N d ago"', () => {
    const [first] = ledgerEvents(SEED_NOW);
    const at = (iso: string) => liveLedgerEntries([{ ...first!, kind: 'merged', at: iso }], SEED_NOW, 'UTC')[0]?.t;
    expect(at(SEED_NOW.toISOString())).toBe(SEED_NOW.toISOString().slice(11, 19));
    expect(at(new Date(SEED_NOW.getTime() - 3 * 86_400_000 - 1000).toISOString())).toBe('3 d ago');
  });

  it('keeps the newest LIVE_LEDGER_MAX moves: events that are not moves do not count against the cap', () => {
    const [first] = ledgerEvents(SEED_NOW);
    const merged = { ...first!, kind: 'merged' as const };
    const noise = Array.from({ length: LIVE_LEDGER_MAX }, () => ({ ...first!, kind: 'deployed' as const }));
    expect(liveLedgerEntries([merged, ...noise], SEED_NOW, 'UTC')).toHaveLength(1);
    const many = Array.from({ length: LIVE_LEDGER_MAX + 5 }, () => merged);
    expect(liveLedgerEntries(many, SEED_NOW, 'UTC')).toHaveLength(LIVE_LEDGER_MAX);
  });

  it('each entry carries its instant, labelled in the screen’s zone, not the process’s', () => {
    const [first] = ledgerEvents(SEED_NOW);
    const one = [{ ...first!, kind: 'merged' as const, at: '2026-10-15T12:00:00Z' }];
    const now = new Date('2026-10-15T18:00:00Z');
    const [prague] = liveLedgerEntries(one, now, 'Europe/Prague');
    expect(prague?.at).toBe(Date.parse('2026-10-15T12:00:00Z'));
    expect(prague?.t).toBe('14:00:00');
    expect(liveLedgerEntries(one, now, 'UTC')[0]?.t).toBe('12:00:00');
  });
});

describe("every live move links to its MR's replay", () => {
  it('each entry carries /theater?mr=<iid>; the demo seed carries none', () => {
    const out = liveLedgerEntries(ledgerEvents(SEED_NOW), SEED_NOW, 'UTC');
    expect(out.find((e) => e.text === '!44 gated at Quarantined')?.replay).toBe('/theater?mr=44');
    expect(out.every((e) => e.replay === `/theater?mr=${/!(\d+)/.exec(e.text)?.[1]}`)).toBe(true);
    expect(LEDGER_SEED.some((e) => 'replay' in e)).toBe(false);
  });

  it('LogItem draws "Replay !N" as a link to it; an entry without one draws no link', () => {
    const [entry] = liveLedgerEntries(ledgerEvents(SEED_NOW), SEED_NOW, 'UTC');
    const html = renderToString(createElement(LogItem, { entry: { ...entry!, replay: '/theater?mr=44' } }));
    expect(html).toContain('<a href="/theater?mr=44"');
    expect(html).toMatch(/<a href="\/theater\?mr=44"[^>]*>Replay !44<\/a>/);
    const bare = { ...entry! };
    delete bare.replay;
    expect(renderToString(createElement(LogItem, { entry: bare }))).not.toContain('<a');
  });
});

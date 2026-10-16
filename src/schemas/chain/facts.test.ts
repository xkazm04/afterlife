// The one event-to-facts table: every key the parser keeps is either a fact row or hidden on purpose, a fact row is only
// what the event states, and an absent key gives no row.
import { describe, expect, it } from 'vitest';
import { ledgerEvents } from '@/server/gitlab/fake/demo/ledger';
import { SEED_NOW } from '@/server/index/seed';
import { append, type LedgerEvent } from '../ledger';
import { eventFacts, FACTS } from './facts';
import { parseStoredLine } from './parse';

type Body = Parameters<typeof append>[1];
const chain = ledgerEvents(SEED_NOW);
const decision = chain[6]!; // !44 tier_decision, observed by the gate's CI job

/** Each line stated, appended to the fake chain, stored as JSON and parsed back as the importer reads it. */
function parsed(bodies: Body[]): LedgerEvent[] {
  const out: LedgerEvent[] = [...chain];
  for (const b of bodies) out.push(append(out, b));
  return out.map((e) => {
    const r = parseStoredLine(JSON.parse(JSON.stringify(e)));
    if (!r.ok) throw new Error(r.reason);
    return r.event;
  });
}

describe('FACTS', () => {
  it('covers every key the parser keeps: a line stating every optional key has no key the table does not name', () => {
    const body = Object.fromEntries(Object.entries(decision).filter(([k]) => !['seq', 'prev_hash', 'hash'].includes(k))) as Body;
    const lines = parsed([
      { ...body, tier_at_time: 'supervised', state_rev: 'c1'.repeat(20), withdrew: ['approval', 'auto_merge'], would: { tier: 'hands_off', decision: 'merge' } },
      { ...body, kind: 'deployed', environment: { name: 'production', tier: 'production' } },
      { ...body, kind: 'guardrail_verdict', verdict: 'block' },
    ]);
    const keys = new Set(lines.flatMap((e) => Object.keys(e)));
    expect(Object.keys(FACTS).sort()).toEqual([...keys].sort());
  });
});

describe('eventFacts', () => {
  it('states who observed the event and where its payload is', () => {
    const facts = eventFacts(decision);
    expect(facts).toContainEqual({ label: 'Observed by', value: 'ci_job' });
    expect(facts).toContainEqual({ label: 'Payload', value: 'proofs/44/tier_decision.json' });
  });

  it('absent stays absent: a task_started has no verdict, environment or decision rows, and no row is empty', () => {
    const facts = eventFacts(chain[0]!);
    expect(chain[0]?.kind).toBe('task_started');
    const labels = facts.map((f) => f.label);
    for (const l of ['Verdict', 'Environment', 'Tier-state read', 'Withdrew', 'Next rung would']) expect(labels).not.toContain(l);
    for (const f of facts) {
      expect(f.value).not.toBe('');
      expect(f.value).not.toContain('undefined');
    }
  });
});

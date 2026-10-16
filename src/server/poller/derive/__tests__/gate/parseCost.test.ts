// gateSeenOf runs once per held class per poll over the whole imported chain: it parses an event's date only for the events
// that are that holder's tier decisions, not for every event of every class.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CountedEvent } from '../../counters';
import { gateSeenOf } from '../../gate';

const CLASSES = Array.from({ length: 15 }, (_, i) => `class.${i}`);
const AGENT = 'ai-qa-acme-lab';
const SINCE = new Date('2026-09-01T00:00:00Z');

const chain = (n: number): CountedEvent[] =>
  Array.from({ length: n }, (_, i) => ({
    agent: AGENT,
    action_class: CLASSES[i % CLASSES.length]!,
    kind: i % 4 === 0 ? 'tier_decision' : 'guardrail_verdict',
    at: new Date(SINCE.getTime() + i * 60_000).toISOString(),
    subject: { type: 'mr', iid: i },
    verdict: 'pass',
    tier_at_time: 'supervised',
  })) as CountedEvent[];

afterEach(() => vi.restoreAllMocks());

describe('gateSeenOf date parsing', () => {
  const events = chain(4000);

  it('parses no date for an event that is not the holder\'s tier decision', () => {
    const parse = vi.spyOn(Date, 'parse');
    for (const classId of CLASSES) gateSeenOf(events, { agent: AGENT, classId, since: SINCE });
    const decisions = events.filter((e) => e.kind === 'tier_decision').length;
    expect(parse.mock.calls.length).toBeLessThanOrEqual(decisions);
  });

  it('still names the latest decision of the class at or after since', () => {
    const last = events.filter((e) => e.kind === 'tier_decision' && e.action_class === CLASSES[0]).at(-1)!;
    expect(gateSeenOf(events, { agent: AGENT, classId: CLASSES[0]!, since: SINCE })).toEqual({ iid: last.subject.iid, tierAtTime: 'supervised', at: last.at });
    expect(gateSeenOf(events, { agent: AGENT, classId: CLASSES[0]!, since: new Date(Date.parse(last.at) + 1) })).toBeNull();
    expect(gateSeenOf(events, { agent: AGENT, classId: 'class.none', since: SINCE })).toBeNull();
  });
});

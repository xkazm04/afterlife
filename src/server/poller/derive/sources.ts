// The outputs behind a record's counts (src/lib/demo/sources.ts): the same tally countRecord totals (./counters.ts), listed.
// Each output since the record's since, newest first, with whether the window counts it, whether anyone else pushed to it
// and whether belay-apply's gate decided it; the ones outside the window; the guardrail blocks; and every fact the counts
// could not read, which is why a counter is null or short. ./tiers.ts stores it on the class's class_tier row (0013).
import { SOURCES_CAP, type CountedOutput, type RecordSources } from '@/lib/demo/sources';
import { NONE, tallyOf, totalsOf, type ClassCounters, type CounterSource, type Holder, type Tally } from './counters';

/** The listed facts of a tally: at most SOURCES_CAP outputs (the newest), missing facts and blocks. */
export function sourcesOf(t: Tally, src: CounterSource): RecordSources {
  const gated = t.gated;
  const outputs: CountedOutput[] = t.ordered.slice(0, SOURCES_CAP).map(([iid, o]) => ({
    iid,
    outcome: o.outcome,
    at: new Date(o.at).toISOString(),
    inWindow: t.inWindow.has(iid),
    edited: o.outcome === 'merged' ? t.edits.get(iid) ?? null : null,
    gated: o.outcome === 'merged' && gated !== null ? gated.has(iid) : null,
  }));
  const missing: RecordSources['missing'] = [];
  if (!src.ledgerRead) missing.push({ iid: null, fact: 'ledger' });
  if (!src.revertDemotes) missing.push({ iid: null, fact: 'revert_policy' });
  for (const iid of t.merged) if (!t.edits.has(iid)) missing.push({ iid, fact: 'edit' });
  if (gated !== null) for (const iid of t.merged) if (!gated.has(iid)) missing.push({ iid, fact: 'tier_decision' });
  for (const iid of t.blocks.unstated) missing.push({ iid, fact: 'verdict' });
  return {
    since: new Date(t.from).toISOString(),
    window: t.window,
    web: src.web ? src.web.replace(/\/+$/, '') : null,
    outputs,
    total: t.ordered.length,
    excluded: outputs.filter((o) => !o.inWindow).map((o) => ({ iid: o.iid, reason: 'outside_window' as const })),
    blocks: t.blocks.iids.slice(0, SOURCES_CAP),
    missing: missing.slice(0, SOURCES_CAP),
  };
}

/** A record's counters and the outputs behind them, from one tally. No since: every counter null, no sources. */
export function recordOf(src: CounterSource, h: Holder, now: Date): { counters: ClassCounters; sources: RecordSources | null } {
  const t = tallyOf(src, h);
  return t ? { counters: totalsOf(t, src, now), sources: sourcesOf(t, src) } : { counters: NONE, sources: null };
}

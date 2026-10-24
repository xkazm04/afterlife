// The class behind a live promotion or re-admit, as the snapshot holds it now. The item is the proposal as the poll opened
// it (its from, its rule counts); the class may have moved since: a tripwire quarantined it, or a person already
// re-admitted it. Then Run is closed: the proposal no longer describes the write. The wording is the Ladder's, from
// src/lib/promotion (mrHref, gateSeenText, displayLastMove); nothing here invents a count. Pure: no clock, no I/O.
import type { ActionClass, NeedsYouItem, RecordCounters, TierKey } from '@/lib/demo';
import { mrHref } from '@/lib/promotion/sources/explain';
import { gateSeenText } from '@/lib/promotion/gate/gateSeen';
import { displayLastMove } from '@/lib/promotion/trigger/trigger';
import { TIER_META } from '@/lib/tiers';
import { classOfTitle } from '../live';

/** How many of the newest counted outputs the evidence lists. */
export const EVIDENCE_OUTPUTS = 5;

/** One counted output: its MR, its GitLab link (null: a plain !iid), what it was, and its marks. */
export interface EvidenceOutput {
  iid: number;
  href: string | null;
  text: string;
  edited: boolean;
  gated: boolean;
}

export type LiveEvidence =
  | { kind: 'missing'; cls: string; line: string }
  | {
      kind: 'class';
      cls: string;
      tier: TierKey;
      /** The tier the proposal was opened from, and the tier now; null: the class has not moved. */
      moved: { from: TierKey; now: TierKey } | null;
      movedLine: string | null;
      /** False when the class moved: the proposal no longer describes the write, so Run is closed. */
      canRun: boolean;
      /** The record as counted now, in words; null: none stated. */
      record: string | null;
      outputs: EvidenceOutput[];
      /** Counted outputs listed beyond `outputs`. */
      more: number;
      /** What the outputs list cannot say on its own ("not listed"); null when it speaks for itself. */
      outputsLine: string | null;
      blocks: { iid: number; href: string | null }[];
      gate: string | null;
      /** A re-admit's tripwire, as the Ladder's Last move words it; null for a promotion. */
      trigger: string | null;
      /** The last poll could not read belay-policy: the tier shown is the last good read's. */
      stale: string | null;
      /** The demo fixture's sources: illustrative. */
      demo: boolean;
    };

const n = (v: number | null | undefined): string => (v === null || v === undefined ? 'not stated' : String(v));

function recordLine(r: RecordCounters | null): string | null {
  if (!r) return null;
  const acc = r.needed === null ? n(r.accepted) : `${n(r.accepted)} / ${r.needed}`;
  return `accepted ${acc} · merged without edits ${n(r.noEdit)} · reverts ${n(r.reverts)} · clean days ${n(r.cleanDays)}`;
}

/** The tier a proposal expects its class at: a promotion's from, a re-admit's quarantine. */
function expected(item: Pick<NeedsYouItem, 'kind' | 'from'>): TierKey | null {
  if (item.kind === 'readmit') return 'quarantined';
  return item.from && Object.hasOwn(TIER_META, item.from) ? (item.from as TierKey) : null;
}

/** The class beside a live promotion or re-admit; `cls` undefined: the index does not hold it. */
export function liveEvidence(
  item: Pick<NeedsYouItem, 'kind' | 'title' | 'from'>,
  cls: ActionClass | undefined,
  stale: { reason: string } | null,
): LiveEvidence {
  const id = cls?.id ?? classOfTitle(item.title) ?? item.title;
  if (!cls) return { kind: 'missing', cls: id, line: `${id} is not in the index: its record and outputs are not shown.` };
  const from = expected(item);
  const moved = from && from !== cls.tier ? { from, now: cls.tier } : null;
  const s = cls.sources ?? null;
  const counted = s ? s.outputs.filter((o) => o.inWindow).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)) : [];
  const shown = counted.slice(0, EVIDENCE_OUTPUTS);
  return {
    kind: 'class',
    cls: cls.id,
    tier: cls.tier,
    moved,
    movedLine: moved ? `${cls.id} moved to ${TIER_META[moved.now].name} since this was proposed; the next poll refreshes or closes it.` : null,
    canRun: !moved,
    record: recordLine(cls.record),
    outputs: shown.map((o) => ({
      iid: o.iid, href: s && mrHref(s, o.iid), text: `${o.outcome} · ${o.at.slice(0, 10)}`, edited: o.edited === true, gated: o.gated === true,
    })),
    more: counted.length - shown.length,
    outputsLine: !s ? 'The outputs behind the counts are not listed for this class.' : counted.length ? null : 'No counted outputs listed.',
    blocks: s ? s.blocks.map((iid) => ({ iid, href: mrHref(s, iid) })) : [],
    gate: gateSeenText(cls.gateSeen, cls.since, null),
    trigger: item.kind === 'readmit' ? displayLastMove(cls.lastMove) : null,
    stale: stale ? `belay-policy was not read by the last poll (${stale.reason}): the tier shown is the last good read's.` : null,
    demo: s?.demo === true,
  };
}

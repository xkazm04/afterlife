// What the Ladder route needs, read through the data source (demo fixture or live index) on the server. The promotion
// thresholds are trust-policy.yml's (getPolicy). What the screen still shows of the demo beside live data, the source
// declares in `illustrative`, and the screen marks it demo: the head (`policy-history`), and the opening ledger while the
// project's own belay-ledger is empty (live, "Who acted" and "All moves" read that chain: ./live/ledgerEntries.ts). Live, a
// class record is the poll's count when one agent holds the class; any other record it keeps is marked `uncounted`.
import { TIER_DISPLAY_ORDER } from '@/lib/tiers';
import { getDataSource } from '@/server/data';
import type { IllustrativePart } from '@/server/data';
import type { NeedsYouItem } from '@/lib/demo';
import { cellOf, displayLastMove, promotionId } from '@/lib/promotion';
import { TIER_ORDER } from '@/schemas/tier';
import type { PromotionAsk, Tier } from '../model/types';
import type { LadderScreenProps } from '../LadderScreen';
import { LEDGER_SEED } from './ledgerSeed';
import { liveLedgerEntries } from './live/ledgerEntries';
import { INITIAL_HEAD } from './policy';

const TIERS: readonly string[] = TIER_DISPLAY_ORDER;
const isTier = (t: string | undefined): t is Tier => t !== 'human_only' && TIERS.includes(t ?? '');

/**
 * Live: the poll counts the record of a class one agent holds, whose cell is its tier (poller/derive/tiers.ts). A class
 * several agents hold, none, or Human only keeps the record the index held: not the poll's.
 */
const counted = (c: Parameters<typeof cellOf>[0]): boolean => (TIER_ORDER as readonly string[]).includes(cellOf(c) ?? '');

/**
 * Live: the promotion asks the poll opened for this project's classes (server/poller/derive/promotion.ts), by class. The
 * poll counted each record and found it eligible by Ladder's own rule; the counts travel with the ask, not the class.
 */
export function asksOf(items: readonly NeedsYouItem[], project: string, classes: readonly { id: string }[]): Map<string, PromotionAsk> {
  const out = new Map<string, PromotionAsk>();
  for (const c of classes) {
    const n = items.find((x) => x.kind === 'promote' && x.id === promotionId(project, c.id));
    if (n && isTier(n.from) && isTier(n.to)) out.set(c.id, { id: n.id, from: n.from, to: n.to, rules: n.rules ?? [] });
  }
  return out;
}

export function loadLadderData(): LadderScreenProps {
  const ds = getDataSource();
  const tiers = ds.getTiers();
  const setup = ds.getSetup();
  const shown = (part: IllustrativePart) => ds.illustrative.includes(part);
  const history = shown('policy-history');
  const live = ds.mode === 'live';
  const all = ds.getActionClasses();
  const asks = live ? asksOf(ds.getNeedsYou(), ds.deepProjectId(), all) : new Map<string, PromotionAsk>();
  const classes = all.map((c) => {
    const ask = asks.get(c.id);
    // the one place a class enters the Ladder (list and class page): the tripwire's trigger is worded here
    const worded = { ...c, lastMove: displayLastMove(c.lastMove) };
    const marked = live && c.record && !counted(c) ? { ...worded, uncounted: true as const } : worded;
    return ask ? { ...marked, ask } : marked;
  });
  // The guardrail's quoted finding, by merge request: the Ladder shows it as untrusted text in the ledger.
  const quotes = Object.fromEntries(ds.getTasks().flatMap((t) => (t.mr && t.quote ? [[t.mr, t.quote] as const] : [])));
  // Live: the deep project's own ledger. The demo's opening ledger only while that chain is empty, and then marked demo.
  const chain = live ? ds.getLedger() : [];
  const ledger = chain.length ? liveLedgerEntries(chain, new Date()) : history ? LEDGER_SEED.map((e) => ({ ...e, demo: true })) : LEDGER_SEED;
  return {
    project: ds.deepProjectId(),
    seed: {
      classes,
      ledger,
      quotes,
      head: history ? { ...INITIAL_HEAD, demo: true } : { ...INITIAL_HEAD },
    },
    tracks: ds.getTracks(),
    means: Object.fromEntries(TIER_DISPLAY_ORDER.map((t) => [t, tiers[t].means])) as LadderScreenProps['means'],
    policy: ds.getPolicy(),
    tiersStale: ds.getTiersStale(),
    illustrative: { history, tracks: shown('tracks') },
    live,
    feedAgeSec: ds.getCockpit().feed.lastPollSec,
    subtitle: `${setup.group} / ${setup.project}`,
  };
}

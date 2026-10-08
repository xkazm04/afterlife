// What the Ladder route needs, read through the data source (demo fixture or live index) on the server. The promotion
// thresholds are trust-policy.yml's (getPolicy). What the screen still shows of the demo beside live data, the source
// declares in `illustrative`, and the screen marks it demo: the opening ledger and head (`policy-history`) and the class
// records' counters (`records`).
import { TIER_DISPLAY_ORDER } from '@/lib/tiers';
import { getDataSource } from '@/server/data';
import type { IllustrativePart } from '@/server/data';
import type { NeedsYouItem } from '@/lib/demo';
import { promotionId } from '@/lib/promotion';
import type { PromotionAsk, Tier } from '../model/types';
import type { LadderScreenProps } from '../LadderScreen';
import { LEDGER_SEED } from './ledgerSeed';
import { INITIAL_HEAD } from './policy';

const TIERS: readonly string[] = TIER_DISPLAY_ORDER;
const isTier = (t: string | undefined): t is Tier => t !== 'human_only' && TIERS.includes(t ?? '');

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
    return ask ? { ...c, ask } : c;
  });
  // The guardrail's quoted finding, by merge request: the Ladder shows it as untrusted text in the ledger.
  const quotes = Object.fromEntries(ds.getTasks().flatMap((t) => (t.mr && t.quote ? [[t.mr, t.quote] as const] : [])));
  return {
    project: ds.deepProjectId(),
    seed: {
      classes,
      ledger: history ? LEDGER_SEED.map((e) => ({ ...e, demo: true })) : LEDGER_SEED,
      quotes,
      head: history ? { ...INITIAL_HEAD, demo: true } : { ...INITIAL_HEAD },
    },
    tracks: ds.getTracks(),
    means: Object.fromEntries(TIER_DISPLAY_ORDER.map((t) => [t, tiers[t].means])) as LadderScreenProps['means'],
    policy: ds.getPolicy(),
    illustrative: { history, records: shown('records') },
    live,
    feedAgeSec: ds.getCockpit().feed.lastPollSec,
    subtitle: `${setup.group} / ${setup.project}`,
  };
}

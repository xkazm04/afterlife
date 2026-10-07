// What the Ladder route needs, read through the data source (demo fixture or live index) on the server. The promotion
// thresholds are trust-policy.yml's (getPolicy). What the screen still shows of the demo beside live data, the source
// declares in `illustrative`, and the screen marks it demo: the opening ledger and head (`policy-history`) and the class
// records' counters (`records`).
import { TIER_DISPLAY_ORDER } from '@/lib/tiers';
import { getDataSource } from '@/server/data';
import type { IllustrativePart } from '@/server/data';
import type { LadderScreenProps } from '../LadderScreen';
import { LEDGER_SEED } from './ledgerSeed';
import { INITIAL_HEAD } from './policy';

export function loadLadderData(): LadderScreenProps {
  const ds = getDataSource();
  const tiers = ds.getTiers();
  const setup = ds.getSetup();
  const shown = (part: IllustrativePart) => ds.illustrative.includes(part);
  const history = shown('policy-history');
  // The guardrail's quoted finding, by merge request: the Ladder shows it as untrusted text in the ledger.
  const quotes = Object.fromEntries(ds.getTasks().flatMap((t) => (t.mr && t.quote ? [[t.mr, t.quote] as const] : [])));
  return {
    project: ds.deepProjectId(),
    seed: {
      classes: ds.getActionClasses(),
      ledger: history ? LEDGER_SEED.map((e) => ({ ...e, demo: true })) : LEDGER_SEED,
      quotes,
      head: history ? { ...INITIAL_HEAD, demo: true } : { ...INITIAL_HEAD },
    },
    tracks: ds.getTracks(),
    means: Object.fromEntries(TIER_DISPLAY_ORDER.map((t) => [t, tiers[t].means])) as LadderScreenProps['means'],
    policy: ds.getPolicy(),
    illustrative: { history, records: shown('records') },
    live: ds.mode === 'live',
    feedAgeSec: ds.getCockpit().feed.lastPollSec,
    subtitle: `${setup.group} / ${setup.project}`,
  };
}

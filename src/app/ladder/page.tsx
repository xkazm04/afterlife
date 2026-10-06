import { getActionClasses, getCockpit, getSetup, getTasks, getTiers, getTracks } from '@/lib/demo';
import { TIER_DISPLAY_ORDER } from '@/lib/tiers';
import { LEDGER_SEED } from '../features/ladder/data/ledgerSeed';
import { LadderScreen } from '../features/ladder/LadderScreen';

export default function LadderPage() {
  const tiers = getTiers();
  const setup = getSetup();
  // The guardrail's quoted finding, by merge request: the Ladder shows it as untrusted text in the ledger.
  const quotes = Object.fromEntries(getTasks().flatMap((t) => (t.mr && t.quote ? [[t.mr, t.quote] as const] : [])));
  return (
    <LadderScreen
      seed={{ classes: getActionClasses(), ledger: LEDGER_SEED, quotes }}
      tracks={getTracks()}
      means={Object.fromEntries(TIER_DISPLAY_ORDER.map((t) => [t, tiers[t].means])) as Record<(typeof TIER_DISPLAY_ORDER)[number], string>}
      feedAgeSec={getCockpit().feed.lastPollSec}
      subtitle={`${setup.group} / ${setup.project}`}
    />
  );
}

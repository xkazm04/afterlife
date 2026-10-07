// What the Ladder route needs, read through the data source (demo fixture or live index) on the server.
import { TIER_DISPLAY_ORDER } from '@/lib/tiers';
import { getDataSource } from '@/server/data';
import type { LadderScreenProps } from '../LadderScreen';
import { LEDGER_SEED } from './ledgerSeed';

export function loadLadderData(): LadderScreenProps {
  const ds = getDataSource();
  const tiers = ds.getTiers();
  const setup = ds.getSetup();
  // The guardrail's quoted finding, by merge request: the Ladder shows it as untrusted text in the ledger.
  const quotes = Object.fromEntries(ds.getTasks().flatMap((t) => (t.mr && t.quote ? [[t.mr, t.quote] as const] : [])));
  return {
    project: ds.deepProjectId(),
    seed: { classes: ds.getActionClasses(), ledger: LEDGER_SEED, quotes },
    tracks: ds.getTracks(),
    means: Object.fromEntries(TIER_DISPLAY_ORDER.map((t) => [t, tiers[t].means])) as LadderScreenProps['means'],
    feedAgeSec: ds.getCockpit().feed.lastPollSec,
    subtitle: `${setup.group} / ${setup.project}`,
  };
}

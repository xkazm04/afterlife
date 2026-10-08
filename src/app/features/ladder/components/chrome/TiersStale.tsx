import { HonestyChip } from '@/components/status/chip/HonestyChip';
import type { TiersStale as Stale } from '@/server/data/types';

/**
 * Live: the last poll could not read belay-policy, so every tier on the screen is the last good read's. The mark and the
 * read's own reason, until a read succeeds. Nothing when the read succeeded (and in demo mode).
 */
export function TiersStale({ stale }: { stale: Stale | null }) {
  if (!stale) return null;
  const since = stale.lastOk ? `last read ${stale.lastOk.slice(0, 16).replace('T', ' ')} UTC` : 'never read';
  return (
    <>
      {' · '}
      <HonestyChip kind="stale">class tiers stale</HonestyChip>{' '}
      <span title={`belay-policy could not be read, so the class tiers are the last good read's (${since})`}>
        belay-policy: {stale.reason} ({since})
      </span>
    </>
  );
}

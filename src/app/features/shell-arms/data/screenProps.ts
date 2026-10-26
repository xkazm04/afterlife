// The legacy list screens' props as their pages pass them, for GET /api/screen/legacy/<key> (the legacy arm-B host,
// nav/b, renders Fleet and Needs you from this JSON until W1/W2 convert them; deleted in W5).
// Each loader reads exactly what its page reads, so the client copy and the real route draw the same screen. Call
// after connection(): the data source is the running server's, never the build's.
import { loadFleetData } from '@/app/features/fleet/data/loadFleetData';
import { loadFleetEstate } from '@/app/features/fleet/data/loadFleetEstate';
import { loadFleetSource } from '@/app/features/fleet/data/loadFleetSource';
import { decodeListState } from '@/app/features/fleet/model/list/urlState';
import { loadNeedsYouView } from '@/app/features/needs-you/data/pick';
import { LEGACY_KEYS, type LegacyKey } from '@/components/shell/nav/b/legacyKeys';
import { readDesk } from '@/server/runs/readDesk';

/**
 * fleet/FleetList.tsx: FleetScreen's props, `start` from the request's query (filters, sort, view, search pass through).
 * The page's `?project=<id>` redirect is a navigation, not a prop: a client that wants it goes to /fleet/<id> itself.
 */
async function fleetProps(search: URLSearchParams) {
  const data = loadFleetData();
  const runner = await readDesk();
  return { data, source: loadFleetSource(), runner, estate: loadFleetEstate(data, runner), start: decodeListState(search) };
}

/** needs-you/page.tsx: the view (desk, live or empty) and the runner's decisions beside it. */
async function needsYouProps() {
  return { view: loadNeedsYouView(), runner: (await readDesk()).needs };
}

export type ScreenProps = {
  fleet: Awaited<ReturnType<typeof fleetProps>>;
  'needs-you': Awaited<ReturnType<typeof needsYouProps>>;
};

export function isScreenKey(key: string): key is LegacyKey {
  return (LEGACY_KEYS as readonly string[]).includes(key);
}

/** One sample screen's props. Throws what its loaders throw (NotReadyError live before the first poll). */
export async function loadScreenProps<K extends LegacyKey>(key: K, search: URLSearchParams): Promise<ScreenProps[K]>;
export async function loadScreenProps(key: LegacyKey, search: URLSearchParams): Promise<ScreenProps[LegacyKey]> {
  if (key === 'fleet') return fleetProps(search);
  return needsYouProps();
}

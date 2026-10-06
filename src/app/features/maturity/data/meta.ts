// Screen-local constants. ILLUSTRATIVE, like the shared demo dataset: same project, engine, scan time and ids
// (pipeline #9850, !41, release v0.4.2, Cloud Run rev 00042).

export const MAT_META = {
  project: 'acme-lab/ledgerline',
  host: 'gitlab.com',
  /** The simulated "now" a rescan stamps. */
  nowClock: '14:24',
  scanAgeMin: 22,
  rescanEvery: 'weekly schedule + on demand',
  rungMeans: [
    'nothing for this stage',
    'present on the default branch',
    'ran on the default branch in the last 14 days and produced an artifact',
    'failing it blocks a merge or deploy',
    'an agent operates it and Belay re-derives its proofs',
  ],
} as const;

/** Where an evidence link would open. */
export const gitlabUrl = (path: string): string => `https://${MAT_META.host}/${MAT_META.project}${path}`;

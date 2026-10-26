// The capability names live mode's unlock map renders: the afterlife doctor's own row labels (probeCapabilities in
// src/server/gitlab/capabilities.ts), in its order. The doctor read is a network call and may fail, so /setup/[node]
// matches a slug against this list instead (fail-open: a slug the live map could render never 404s because a probe
// failed). liveCapabilities.test.ts holds it to probeCapabilities' real labels.
export const LIVE_CAP_LABELS: readonly string[] = [
  'pipelines and jobs',
  'merge requests (group)',
  'releases (group)',
  'CI/CD components',
  'SAST and other security reports in MRs',
  'custom flows (Duo Agent Platform)',
  'Flows API (start and trace flows)',
  'service accounts (group)',
  'deployment approvals',
  'vulnerability API',
  'audit events (group)',
];

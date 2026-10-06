/** belay doctor capabilities: short labels, which track relies on which (illustrative), notes, the other group. */
export const CAP_SHORT: Readonly<Record<string, string>> = {
  'Pipelines, MRs, releases': 'Pipelines, MRs, releases',
  'CI/CD components, pinned include': 'CI/CD components',
  'SAST, secrets, dependency scanning': 'SAST, secrets, dep. scans',
  'Custom flows on MR and pipeline triggers': 'Flows on MR / pipeline',
  'Service accounts for flows': 'Service accounts for flows',
  'Deployment approvals (protected environments)': 'Deployment approvals',
  'Vulnerability report via GraphQL / MCP': 'Vulnerability report by API',
  'Flow created by API (not only UI)': 'Flow created by API',
  'AI audit event report': 'AI audit event report',
};

export const CAP_VULN = 'Vulnerability report via GraphQL / MCP';
export const CAP_FLOW_API = 'Flow created by API (not only UI)';

/** Illustrative: not in the dataset. */
export const CAP_USES: Readonly<Record<string, readonly string[]>> = {
  'Pipelines, MRs, releases': ['T3', 'T5'],
  'CI/CD components, pinned include': ['T6', 'T8'],
  'SAST, secrets, dependency scanning': ['T6', 'T1'],
  'Custom flows on MR and pipeline triggers': ['T4', 'T1'],
  'Service accounts for flows': ['T4', 'T3'],
  'Deployment approvals (protected environments)': ['T7'],
  'Vulnerability report via GraphQL / MCP': ['T2'],
  'Flow created by API (not only UI)': [],
  'AI audit event report': [],
};

export const CAP_NOTE: Readonly<Record<string, string>> = {
  'Vulnerability report via GraphQL / MCP': 'Resolves when the first scan runs (step 12). Until then T2 reads findings from the pipeline report.',
  'Flow created by API (not only UI)': 'Decides who does step 11. If it stays unknown or unavailable, step 11 becomes a gate.',
  'AI audit event report': 'No track depends on it: T3 writes its own ledger.',
};

/** A second group the user can switch to (never probed until Re-probe); its capabilities by row position. */
export const OTHER_GROUP = {
  name: 'acme-sandbox',
  rows: ['available', 'available', 'unavailable', 'unavailable', 'available', 'unavailable', 'unknown', 'unknown', 'unavailable'],
} as const;

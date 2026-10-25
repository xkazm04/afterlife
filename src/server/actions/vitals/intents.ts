// The project writes' fields, validated one by one before anything is planned (intents.ts calls this for their kinds).
// Every value that reaches an az argv is a whitelisted shape and is passed as one argument, never through a shell.
import type { ProjectIntent } from '../types';

type Rec = Record<string, unknown>;
type Parse = { ok: true; intent: ProjectIntent } | { ok: false; reason: string };
const no = (reason: string): Parse => ({ ok: false, reason });
const str = (v: unknown, re: RegExp): string | null => (typeof v === 'string' && re.test(v) ? v : null);

/** A git branch as Azure Pipelines takes it: plain ref characters, no '..', no leading '-' or '/'. */
export const BRANCH = /^(?!-)(?!\/)(?!.*\.\.)(?!.*\/$)[A-Za-z0-9._/-]{1,200}$/;
const CLAIM_ID = /^[A-Za-z0-9_-]{1,64}$/;
const DIGITS = /^\d{1,12}$/;
/** Azure resource names: App Insights components and resource groups (letters, digits, - _ . ( )), App Service sites and slots. */
const COMPONENT = /^[A-Za-z0-9][A-Za-z0-9._()-]{0,254}$/;
const GROUP = /^[A-Za-z0-9._()-]{1,90}$/;
const SITE = /^[A-Za-z0-9][A-Za-z0-9-]{0,59}$/;
const REGION = /^[a-z0-9]{2,40}$/;
const WORKSPACE = /^\/subscriptions\/[0-9a-f-]{36}\/resourceGroups\/[A-Za-z0-9._()-]{1,90}\/providers\/Microsoft\.OperationalInsights\/workspaces\/[A-Za-z0-9-]{4,63}$/i;

/** `West Europe` -> `westeurope`: the region name az takes. */
export const regionName = (s: string): string => s.toLowerCase().replace(/\s+/g, '');

export function parseProjectIntent(raw: Rec, base: { project: string; proposal?: string }): Parse {
  switch (raw.kind) {
    case 'queue-runs': {
      const claimId = str(raw.claimId, CLAIM_ID);
      const pipelineId = str(raw.pipelineId, DIGITS);
      const branch = str(raw.branch, BRANCH);
      const n = typeof raw.n === 'number' && Number.isInteger(raw.n) && raw.n >= 1 && raw.n <= 5 ? raw.n : null;
      if (!claimId || !pipelineId || !branch || n === null) return no('queue-runs needs claimId, pipelineId (digits), branch (a branch name) and n (1 to 5)');
      return { ok: true, intent: { kind: 'queue-runs', ...base, claimId, pipelineId, branch, n } };
    }
    case 'install-skill':
      return { ok: true, intent: { kind: 'install-skill', ...base } };
    case 'enable-app-insights': {
      const name = str(raw.name, COMPONENT);
      const resourceGroup = str(raw.resourceGroup, GROUP);
      const workspaceId = str(raw.workspaceId, WORKSPACE);
      const site = str(raw.site, SITE);
      const slot = raw.slot === undefined ? undefined : str(raw.slot, SITE);
      const location = raw.location === undefined ? undefined : typeof raw.location === 'string' && REGION.test(regionName(raw.location)) ? regionName(raw.location) : null;
      if (!name || !resourceGroup || !workspaceId || !site || slot === null || location === null) {
        return no('enable-app-insights needs name, resourceGroup, workspaceId (the workspace ARM id) and site, each an Azure name; slot and location are optional');
      }
      return { ok: true, intent: { kind: 'enable-app-insights', ...base, name, resourceGroup, workspaceId, site, ...(slot ? { slot } : {}), ...(location ? { location } : {}) } };
    }
    default:
      return no('unknown intent kind');
  }
}

'use server';

// The save step's two writes for a just-saved project, as intents built on the server from its saved config, so a
// screen never spells their fields or commands: install-skill always, enable-app-insights when its cloud is Log
// Analytics only (the workspace's ARM id from the saved logs block, the site the HTTP logs were narrowed to). The
// commands themselves are the preview's (previewAction), which also reads the site's region. Writes nothing.
import { loadProjects } from '@/server/discover';
import type { EnableAppInsights, InstallSkill } from '@/server/actions/types';

export interface SaveWrites {
  skill?: InstallSkill;
  /** The App Insights intent, or why there is none for this project. */
  insights?: EnableAppInsights | { reason: string };
}

export async function saveWrites(slug: unknown): Promise<SaveWrites> {
  const cfg = typeof slug === 'string' ? loadProjects().find((p) => p.slug === slug) : undefined;
  if (!cfg) return {};
  const skill: InstallSkill = { kind: 'install-skill', project: cfg.slug };
  const logs = cfg.cloud.logs;
  if (cfg.cloud.provider === 'azure-app-insights') return { skill, insights: { reason: 'App Insights is already its cloud' } };
  if (!logs?.site) return { skill, insights: { reason: 'no App Service was found in the Log Analytics logs to point at a component' } };
  const workspaceId = `/subscriptions/${logs.subscription}/resourceGroups/${logs.resourceGroup}/providers/Microsoft.OperationalInsights/workspaces/${logs.name}`;
  return { skill, insights: { kind: 'enable-app-insights', project: cfg.slug, name: `${logs.site}-insights`, resourceGroup: logs.resourceGroup, workspaceId, site: logs.site } };
}

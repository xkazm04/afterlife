// The Fleet screen: every watched project, its class tiers, proofs, nine rungs and feed age.
import type { TierCounts } from '@/lib/demo/types';
import { listClassTiers } from '../repositories/fleet/classTier';
import { listProjects, type ProjectRow } from '../repositories/fleet/project';
import { listProjectStages } from '../repositories/fleet/stages';
import { listGroups, listTrustClasses } from '../repositories/fleet/taxonomy';
import { feedStatusOf, listPollStates, projectSource } from '../repositories/pollState';
import type { Queryable } from '../repositories/sql';
import { clock } from './format';
import type { FleetProject, FleetView } from './types';

const NO_TIERS = (): TierCounts => ({ hands_off: 0, supervised: 0, assisted: 0, quarantined: 0, human_only: 0 });
const NO_RUNGS = (): null[] => Array.from({ length: 9 }, () => null);

/** The same value as DEMO.fleet, built from the index. `now` fixes the clock the feed ages are measured against. */
export async function getFleet(db: Queryable, now: Date = new Date()): Promise<FleetView> {
  const [projects, groups, classes, tiers, stages, polls] = await Promise.all([
    listProjects(db), listGroups(db), listTrustClasses(db), listClassTiers(db), listProjectStages(db), listPollStates(db, 'project:'),
  ]);
  const classIds = classes.map((c) => c.id);
  const byProject = new Map<string, Map<string, string | null>>();
  for (const t of tiers) {
    const m = byProject.get(t.projectId) ?? new Map<string, string | null>();
    m.set(t.classId, t.tier);
    byProject.set(t.projectId, m);
  }
  const pollOf = new Map(polls.map((p) => [p.source, p]));

  const toProject = (p: ProjectRow): FleetProject => {
    const held = byProject.get(p.id) ?? new Map<string, string | null>();
    const counts = NO_TIERS();
    const classTiers: FleetProject['classTiers'] = {};
    for (const id of classIds) {
      const tier = (held.get(id) ?? null) as FleetProject['classTiers'][string];
      classTiers[id] = tier;
      if (tier) counts[tier] += 1;
    }
    return {
      id: p.id, name: p.name, what: p.what, state: p.state, armed: p.armed, tiers: counts,
      proofs7d: p.proofs7d, demotions7d: p.demotions7d, needsYou: p.needsYou,
      stages: stages.get(p.id) ?? NO_RUNGS(),
      feed: feedStatusOf(pollOf.get(projectSource(p.id)) ?? null, now),
      ...(p.envStaging !== null && p.envProduction !== null ? { env: { staging: p.envStaging, production: p.envProduction } } : {}),
      craOpen: p.craOpen,
      ...(p.last ? { last: { at: clock(p.last.at), track: p.last.track, text: p.last.text } } : {}),
      group: p.groupPath, classTiers,
      ...(p.setupStep !== null ? { setupStep: p.setupStep } : {}),
    };
  };
  return { classes: classIds, groups, projects: projects.map(toProject) };
}

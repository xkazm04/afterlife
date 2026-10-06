// Loads the fixture's fleet (all 184 projects) into the index.
import { DEMO } from '@/lib/demo';
import type { FleetProject } from '@/lib/demo/types';
import type { ClassTierRow } from '../repositories/fleet/classTier';
import { upsertClassTiers } from '../repositories/fleet/classTier';
import { upsertProjects, type ProjectRow } from '../repositories/fleet/project';
import { setProjectStages } from '../repositories/fleet/stages';
import { upsertGroups, upsertTrustClasses } from '../repositories/fleet/taxonomy';
import { projectSource, setPollStates, type PollStateRow } from '../repositories/pollState';
import type { Queryable } from '../repositories/sql';
import { onDayAt } from './parse';

const trackNumber = (t: string): number | null => (/^T(\d)$/.test(t) ? Number(t.slice(1)) : null);

function projectRow(p: FleetProject, ord: number, now: Date): ProjectRow {
  return {
    id: p.id, gitlabId: null, name: p.name, what: p.what, groupPath: p.group, state: p.state,
    setupStep: p.setupStep ?? null, ord, armed: p.armed, proofs7d: p.proofs7d, demotions7d: p.demotions7d,
    needsYou: p.needsYou, craOpen: p.craOpen, envStaging: p.env?.staging ?? null, envProduction: p.env?.production ?? null,
    last: p.last ? { at: onDayAt(now, p.last.at), track: p.last.track, text: p.last.text } : null,
  };
}

function pollRow(p: FleetProject, now: Date): PollStateRow | null {
  const { ageSec, ok, error } = p.feed;
  if (ageSec === null && ok === null) return null;
  return {
    source: projectSource(p.id),
    lastOk: ageSec === null ? null : new Date(now.getTime() - ageSec * 1000),
    lastError: ok === false ? (error ?? 'poll failed') : null,
  };
}

export async function seedFleet(db: Queryable, now: Date): Promise<void> {
  const { fleet, actionClasses } = DEMO;
  await upsertGroups(db, fleet.groups);
  await upsertTrustClasses(
    db,
    fleet.classes.map((id, ord) => {
      const c = actionClasses.find((a) => a.id === id);
      return { id, ord, track: c ? trackNumber(c.track) : null, agent: null, ceiling: c?.ceiling ?? 'human_only' };
    }),
  );
  await upsertProjects(db, fleet.projects.map((p, i) => projectRow(p, i, now)));
  await setProjectStages(db, new Map(fleet.projects.map((p) => [p.id, p.stages])));
  const tiers: ClassTierRow[] = fleet.projects.flatMap((p) =>
    Object.entries(p.classTiers).map(([classId, tier]) => ({
      projectId: p.id, classId, tier, since: null, setBy: null, leaseExpires: null, record: null, move: null,
    })),
  );
  await upsertClassTiers(db, tiers);
  await setPollStates(db, fleet.projects.flatMap((p) => pollRow(p, now) ?? []));
}

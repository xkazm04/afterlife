// Loads the fixture's fleet (all 184 projects) into the index. Each class tier goes through the gate's rule
// (engine/decide/standing.ts effectiveOf) under its ceiling, so the demo never shows a tier the gate would cap.
import { DEMO } from '@/lib/demo';
import type { FleetProject } from '@/lib/demo/types';
import { isStanding, type ClassCell } from '@/lib/tiers';
import type { Ceiling } from '@/schemas/tier';
import { effectiveOf } from '../../../../engine/decide/standing';
import type { ClassTierRow } from '../repositories/fleet/classTier';
import { upsertClassTiers } from '../repositories/fleet/classTier';
import { upsertProjects, type ProjectRow } from '../repositories/fleet/project';
import { setProjectStages } from '../repositories/fleet/stages';
import { upsertGroups, upsertTrustClasses } from '../repositories/fleet/taxonomy';
import { projectSource, setPollStates, type PollStateRow } from '../repositories/pollState';
import type { Queryable } from '../repositories/sql';
import { storedOf } from '../views/standing';
import { onDayAt } from './parse';

const trackNumber = (t: string): number | null => (/^T(\d)$/.test(t) ? Number(t.slice(1)) : null);

/** A fixture cell as the gate would grant it under the class ceiling (the fixture records no lease, so none lapses). */
export function cappedCell(cell: ClassCell, ceiling: Ceiling, now: Date): ClassCell {
  if (cell === null || isStanding(cell)) return cell;
  if (ceiling === 'human_only' || cell === 'human_only') return 'human_only'; // no agent ever holds it
  return effectiveOf({ tier: cell }, ceiling, now).tier;
}

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
  const ceiling = (id: string): Ceiling => actionClasses.find((a) => a.id === id)?.ceiling ?? 'human_only';
  await upsertGroups(db, fleet.groups);
  await upsertTrustClasses(
    db,
    fleet.classes.map((id, ord) => {
      const c = actionClasses.find((a) => a.id === id);
      return { id, ord, track: c ? trackNumber(c.track) : null, agent: null, ceiling: ceiling(id) };
    }),
  );
  await upsertProjects(db, fleet.projects.map((p, i) => projectRow(p, i, now)));
  await setProjectStages(db, new Map(fleet.projects.map((p) => [p.id, p.stages])));
  const tiers: ClassTierRow[] = fleet.projects.flatMap((p) =>
    Object.entries(p.classTiers).map(([classId, raw]): ClassTierRow => {
      const cell = cappedCell(raw, ceiling(classId), now);
      // stored as the poller stores it (views/standing.ts), so Fleet, the door and Ladder read it back the same way
      return { projectId: p.id, classId, since: null, setBy: null, leaseExpires: null, record: null, ...storedOf({ cell, holders: p.holders?.[classId]?.map((h) => ({ ...h })) ?? null }) };
    }),
  );
  await upsertClassTiers(db, tiers);
  await setPollStates(db, fleet.projects.flatMap((p) => pollRow(p, now) ?? []));
}

// Server-side slice of the data source (demo fixture or live index). The route file calls this, so the client bundle
// never carries the whole dataset. The desk is built around five specific inbox items and the !44 incident:
// `pickNeedsYouDemo` throws when the source lacks them. It is the demo's desk: in live mode the page never draws it, and
// shows the group's own open items instead, without the demo's seeded ones (`loadNeedsYouView`).
import { DEMO, type NeedsYouItem } from '@/lib/demo';
import { TIER_ORDER, type Tier } from '@/schemas/tier';
import { getDataSource } from '@/server/data';
import type { NeedsYouDemo } from './types';

export class MissingNeedsYouData extends Error {}

function item(items: readonly NeedsYouItem[], id: string): NeedsYouItem {
  const found = items.find((n) => n.id === id);
  if (!found) throw new MissingNeedsYouData(`needsYou item ${id} is missing`);
  return found;
}

/** The action class an inbox title names after its last " · " ("Promote T1 patcher · dep-bump.patch"), if the source has it. */
function classOf(title: string, classes: readonly { id: string }[]): string {
  const id = title.split(' · ').at(-1) ?? '';
  if (!classes.some((c) => c.id === id)) throw new MissingNeedsYouData(`no action class ${id} for "${title}"`);
  return id;
}

const tierOf = (t: string | undefined): Tier | null => TIER_ORDER.find((x) => x === t) ?? null;

export function pickNeedsYouDemo(): NeedsYouDemo {
  const ds = getDataSource();
  const items = ds.getNeedsYou();
  const n1 = item(items, 'n1');
  const n2 = item(items, 'n2');
  const n4 = item(items, 'n4');
  const maturity = ds.getMaturity();
  const task = ds.getTasks().find((t) => t.mr === '!44');
  const record = ds.getActionClasses().find((c) => c.id === 'patch-bump')?.record;
  const to = tierOf(n1.to);
  if (!n1.from || !to || !task || !record) throw new MissingNeedsYouData('promote item, incident !44 or patch-bump record is missing');
  const tiers = ds.getTiers();
  const classes = ds.getActionClasses();
  return {
    project: ds.deepProjectId(),
    promote: { title: n1.title, cls: classOf(n1.title, classes), from: n1.from, to, rules: n1.rules ?? [] },
    signoff: { title: n2.title, linksResolved: n2.linksResolved ?? '' },
    readmit: { title: n4.title, cls: classOf(n4.title, classes), reason: n4.reason ?? '' },
    runner: { title: item(items, 'n5').title },
    gaps: maturity.proposals,
    rungNames: maturity.rungNames,
    incident: { title: task.title, reason: task.reason ?? '', quote: task.quote ?? '' },
    record,
    tierMeans: {
      hands_off: tiers.hands_off.means,
      supervised: tiers.supervised.means,
      assisted: tiers.assisted.means,
      quarantined: tiers.quarantined.means,
      human_only: tiers.human_only.means,
    },
  };
}

/** What the route draws: the desk (demo), the group's own open items (live), or the honest empty state. */
export type NeedsYouView =
  | { kind: 'desk'; demo: NeedsYouDemo }
  | { kind: 'live'; items: readonly NeedsYouItem[]; seeded: number }
  | { kind: 'empty'; seeded: number };

/** The inbox items the demo seeds (the desk's five and the gap picks): in live mode they are the seed's, not the group's. */
export const SEEDED_ITEMS: ReadonlySet<string> = new Set([...DEMO.needsYou.map((n) => n.id), ...DEMO.maturity.proposals.map((g) => g.id)]);

/**
 * Demo: the desk, or the empty state when the source lacks its items. Live: never the desk (it is built around the
 * demo's seeded items, the !44 incident and the patch-bump record); the group's own open items, minus any the demo
 * seeded into the index, or the empty state saying how many seeded ones it does not show.
 */
export function loadNeedsYouView(): NeedsYouView {
  const ds = getDataSource();
  if (ds.mode === 'live') {
    const all = ds.getNeedsYou();
    const items = all.filter((n) => !SEEDED_ITEMS.has(n.id));
    const seeded = all.length - items.length;
    return items.length ? { kind: 'live', items, seeded } : { kind: 'empty', seeded };
  }
  try {
    return { kind: 'desk', demo: pickNeedsYouDemo() };
  } catch (e) {
    if (e instanceof MissingNeedsYouData) return { kind: 'empty', seeded: 0 };
    throw e;
  }
}

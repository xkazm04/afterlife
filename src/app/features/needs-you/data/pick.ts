// Server-side slice of the data source (demo fixture or live index). The route file calls this, so the client bundle
// never carries the whole dataset. This screen is built around five specific inbox items and the !44 incident:
// `pickNeedsYouDemo` throws when the source lacks them, `loadNeedsYou` answers null so the page can say so.
import type { NeedsYouItem } from '@/lib/demo';
import { getDataSource } from '@/server/data';
import type { NeedsYouDemo } from './types';

export class MissingNeedsYouData extends Error {}

function item(items: readonly NeedsYouItem[], id: string): NeedsYouItem {
  const found = items.find((n) => n.id === id);
  if (!found) throw new MissingNeedsYouData(`needsYou item ${id} is missing`);
  return found;
}

export function pickNeedsYouDemo(): NeedsYouDemo {
  const ds = getDataSource();
  const items = ds.getNeedsYou();
  const n1 = item(items, 'n1');
  const n2 = item(items, 'n2');
  const n4 = item(items, 'n4');
  const maturity = ds.getMaturity();
  const task = ds.getTasks().find((t) => t.mr === '!44');
  const record = ds.getActionClasses().find((c) => c.id === 'patch-bump')?.record;
  if (!n1.from || !n1.to || !task || !record) throw new MissingNeedsYouData('promote item, incident !44 or patch-bump record is missing');
  const tiers = ds.getTiers();
  return {
    promote: { title: n1.title, from: n1.from, to: n1.to, rules: n1.rules ?? [] },
    signoff: { title: n2.title, linksResolved: n2.linksResolved ?? '' },
    readmit: { title: n4.title, reason: n4.reason ?? '' },
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

/** The screen's data, or null when the source does not hold the items it is built around (a live group with none of them yet). */
export function loadNeedsYou(): NeedsYouDemo | null {
  try {
    return pickNeedsYouDemo();
  } catch (e) {
    if (e instanceof MissingNeedsYouData) return null;
    throw e;
  }
}

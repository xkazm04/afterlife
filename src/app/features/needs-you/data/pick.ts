// Server-side slice of the shared demo dataset. The route file calls this, so the client bundle never carries
// the whole JSON. Throws when the fixture lacks what the screen needs.
import { getActionClasses, getMaturity, getNeedsYou, getTasks, getTiers, type NeedsYouItem } from '@/lib/demo';
import type { NeedsYouDemo } from './types';

function item(items: readonly NeedsYouItem[], id: string): NeedsYouItem {
  const found = items.find((n) => n.id === id);
  if (!found) throw new Error(`demo: needsYou item ${id} is missing`);
  return found;
}

export function pickNeedsYouDemo(): NeedsYouDemo {
  const items = getNeedsYou();
  const n1 = item(items, 'n1');
  const n2 = item(items, 'n2');
  const n4 = item(items, 'n4');
  const maturity = getMaturity();
  const task = getTasks().find((t) => t.mr === '!44');
  const record = getActionClasses().find((c) => c.id === 'patch-bump')?.record;
  if (!n1.from || !n1.to || !task || !record) throw new Error('demo: promote item, incident !44 or patch-bump record is missing');
  const tiers = getTiers();
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

'use client';

import { Lozenge } from '@/components/controls/lozenge/Lozenge';
import { LozengeButton } from '@/components/controls/lozenge/LozengeButton';
import { LozengeDivider } from '@/components/controls/lozenge/LozengeDivider';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import { StateGlyph } from '@/components/status/StateGlyph';
import { TierMark } from '@/components/status/TierMark';
import { Unread } from '@/components/shell/host';
import type { FleetProject } from '@/lib/demo/types';
import { countSmart } from '../../model/list/smartFilters';
import type { SmartId, Source } from '../../model/types';

/**
 * The toolbar lozenge: decisions waiting, stale feeds, unwatched projects, quarantined classes. Each cell is also
 * a filter: press it to show only those projects, press it again to show all. `unread`: the fleet is not read yet, every
 * count is a dash (and the waiting badge is not drawn: nothing is known to wait).
 */
export function StatusLozenge({
  projects,
  waiting,
  compact,
  source,
  onSource,
  unread = false,
}: {
  projects: readonly FleetProject[];
  waiting: number;
  compact: boolean;
  source: Source;
  onSource: (source: Source) => void;
  unread?: boolean;
}) {
  const pick = (id: SmartId) => () => onSource(source === id ? 'all' : id);
  const count = (id: SmartId) => (unread ? <Unread label={`${id} not read yet`} /> : countSmart(projects, id));
  return (
    <Lozenge label="Fleet status">
      <LozengeButton
        lead={unread ? <Unread label="decisions waiting not read yet" /> : <NeedsYouBadge count={waiting} showZero />}
        word={compact ? undefined : 'waiting'}
        pressed={source === 'needs'}
        title="Decisions waiting for you: press to show only those, again for all"
        onClick={pick('needs')}
      />
      <LozengeDivider />
      <LozengeButton lead={<StateGlyph state="stale" />} count={count('stale')} word={compact ? undefined : 'stale'} pressed={source === 'stale'} title="Stale feeds: press to show only those, again for all" onClick={pick('stale')} />
      <LozengeButton
        lead={<StateGlyph state="not-set-up" />}
        count={count('unwatched')}
        word={compact ? undefined : 'not watched'}
        pressed={source === 'unwatched'}
        title="Not watched: press to show only those, again for all"
        onClick={pick('unwatched')}
      />
      <LozengeButton
        lead={<TierMark tier="quarantined" />}
        count={count('quar')}
        word={compact ? undefined : 'quarantined'}
        pressed={source === 'quar'}
        title="Projects with a quarantined class: press to show only those, again for all"
        onClick={pick('quar')}
      />
    </Lozenge>
  );
}

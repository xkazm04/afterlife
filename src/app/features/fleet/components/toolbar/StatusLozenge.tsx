'use client';

import { Lozenge } from '@/components/controls/lozenge/Lozenge';
import { LozengeButton } from '@/components/controls/lozenge/LozengeButton';
import { LozengeDivider } from '@/components/controls/lozenge/LozengeDivider';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import { StateGlyph } from '@/components/status/StateGlyph';
import { TierMark } from '@/components/status/TierMark';
import type { FleetProject } from '@/lib/demo/types';
import { countSmart } from '../../model/list/smartFilters';
import type { SmartId, Source } from '../../model/types';

/**
 * The toolbar lozenge: decisions waiting, stale feeds, unwatched projects, quarantined classes. Each cell is also
 * a filter: press it to show only those projects, press it again to show all.
 */
export function StatusLozenge({
  projects,
  waiting,
  compact,
  source,
  onSource,
}: {
  projects: readonly FleetProject[];
  waiting: number;
  compact: boolean;
  source: Source;
  onSource: (source: Source) => void;
}) {
  const pick = (id: SmartId) => () => onSource(source === id ? 'all' : id);
  return (
    <Lozenge label="Fleet status">
      <LozengeButton lead={<NeedsYouBadge count={waiting} showZero />} word={compact ? undefined : 'waiting'} pressed={source === 'needs'} title="Decisions waiting for you" onClick={pick('needs')} />
      <LozengeDivider />
      <LozengeButton lead={<StateGlyph state="stale" />} count={countSmart(projects, 'stale')} word={compact ? undefined : 'stale'} pressed={source === 'stale'} title="Stale feeds" onClick={pick('stale')} />
      <LozengeButton
        lead={<StateGlyph state="not-set-up" />}
        count={countSmart(projects, 'unwatched')}
        word={compact ? undefined : 'not watched'}
        pressed={source === 'unwatched'}
        title="Not watched"
        onClick={pick('unwatched')}
      />
      <LozengeButton
        lead={<TierMark tier="quarantined" />}
        count={countSmart(projects, 'quar')}
        word={compact ? undefined : 'quarantined'}
        pressed={source === 'quar'}
        title="Projects with a quarantined class"
        onClick={pick('quar')}
      />
    </Lozenge>
  );
}

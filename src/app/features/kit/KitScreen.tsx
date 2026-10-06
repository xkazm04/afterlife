'use client';

import { useState } from 'react';
import { Lozenge } from '@/components/controls/lozenge/Lozenge';
import { LozengeButton } from '@/components/controls/lozenge/LozengeButton';
import { LozengeDivider } from '@/components/controls/lozenge/LozengeDivider';
import { PopupButton } from '@/components/controls/toolbar/PopupButton';
import { SearchField } from '@/components/controls/toolbar/SearchField';
import { SegmentedControl } from '@/components/controls/toolbar/SegmentedControl';
import { Spacer } from '@/components/controls/Spacer';
import { CommandBlock } from '@/components/inspector/CommandBlock';
import type { MenuEntry } from '@/components/overlays/menu/menuModel';
import { useMenu } from '@/components/overlays/menu/useMenu';
import { Legend } from '@/components/overlays/popover/Legend';
import { Sheet } from '@/components/overlays/Sheet';
import { Button } from '@/components/controls/Button';
import { PaneScroll } from '@/components/shell/PaneScroll';
import { SidebarItem } from '@/components/shell/sidebar/SidebarItem';
import { SidebarSection } from '@/components/shell/sidebar/SidebarSection';
import { Window } from '@/components/shell/Window';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import { StateGlyph } from '@/components/status/StateGlyph';
import { TierMark } from '@/components/status/TierMark';
import { Icon } from '@/components/icons/Icon';
import { ControlsGallery } from './components/ControlsGallery';
import { OverlaysGallery } from './components/OverlaysGallery';
import { StatusGallery } from './components/StatusGallery';
import { VizGallery } from './components/VizGallery';
import { InspectorGallery } from './components/inspector/InspectorGallery';
import { TableGallery } from './components/table/TableGallery';

type View = 'tiers' | 'classes' | 'stages';
const VIEWS = [
  { value: 'tiers', label: 'Tiers' },
  { value: 'classes', label: 'Classes' },
  { value: 'stages', label: 'Stages' },
] as const;

/** The dev gallery: every shared component in every state, inside the real Window. Not linked from the nav. */
export function KitScreen() {
  const [view, setView] = useState<View>('tiers');
  const [q, setQ] = useState('');
  const [grouped, setGrouped] = useState(true);
  const [sheet, setSheet] = useState(false);
  const sortMenu = useMenu(() => [
    { head: 'Sort by' },
    { label: 'Attention', checked: true, run: () => {} },
    { label: 'Name', checked: false, run: () => {} },
    { sep: true },
    { label: 'Show Groups', checked: grouped, run: () => setGrouped((g) => !g) },
  ] satisfies MenuEntry[]);

  return (
    <Window
      title="Kit"
      subtitle="Shared components, every state"
      toolbar={
        <>
          <SegmentedControl label="Columns" options={VIEWS} value={view} onChange={setView} />
          <Spacer />
          <Lozenge label="Fleet status">
            <LozengeButton lead={<NeedsYouBadge count={115} />} word="waiting" title="Decisions waiting for you" pressed />
            <LozengeDivider />
            <LozengeButton lead={<StateGlyph state="stale" />} count={11} word="stale" />
            <LozengeButton lead={<TierMark tier="quarantined" />} count={25} word="quarantined" />
          </Lozenge>
          <Spacer />
          <PopupButton icon="sort" onClick={(e) => sortMenu.openFrom(e.currentTarget)}>
            Attention
          </PopupButton>
          <SearchField value={q} onChange={setQ} label="Search the gallery" />
          {sortMenu.menu}
        </>
      }
      sidebar={
        <>
          <SidebarSection title="Sources">
            <SidebarItem icon={<Icon name="folder" />} label="All projects" count={184} current />
            <SidebarItem icon={<Icon name="folder" />} label="core-banking" count={38} />
            <SidebarItem icon={<StateGlyph state="stale" />} label="Stale" count={11} />
            <SidebarItem icon={<TierMark tier="quarantined" />} label="Has quarantine" count={25} />
          </SidebarSection>
        </>
      }
      inspector={<InspectorGallery />}
      status="kit gallery · 5 sections · text size follows Settings"
      help={
        <Legend
          rows={[
            [<TierMark key="h" tier="hands_off" />, 'Hands-off: acts alone, revocable'],
            [<NeedsYouBadge key="n" count={3} />, 'Decisions waiting for you'],
            [<StateGlyph key="s" state="not-set-up" />, 'Unknown is dashed'],
          ]}
        />
      }
    >
      <PaneScroll>
        <StatusGallery />
        <VizGallery />
        <ControlsGallery />
        <OverlaysGallery onOpenSheet={() => setSheet(true)} />
        <TableGallery />
      </PaneScroll>
      {sheet ? (
        <Sheet
          title="Send 2 gaps"
          subtitle="Belay writes only when you press Run"
          onClose={() => setSheet(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setSheet(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setSheet(false)}>
                Run
              </Button>
            </>
          }
        >
          <CommandBlock commands={['glab mr create --source-branch belay/gap-1', 'glab mr create --source-branch belay/gap-2']} />
        </Sheet>
      ) : null}
    </Window>
  );
}

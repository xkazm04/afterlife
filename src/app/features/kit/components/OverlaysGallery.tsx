'use client';

import { useState } from 'react';
import { Button } from '@/components/controls/Button';
import type { MenuEntry } from '@/components/overlays/menu/menuModel';
import { useMenu } from '@/components/overlays/menu/useMenu';
import { Legend } from '@/components/overlays/popover/Legend';
import { usePopover } from '@/components/overlays/popover/usePopover';
import { useToast } from '@/components/overlays/toast/useToast';
import { TierMark } from '@/components/status/TierMark';
import { GallerySection } from './GallerySection';
import { Specimen } from './Specimen';

/** Menu (right-click), Popover (hover and sticky), Sheet, Toast and the status message. */
export function OverlaysGallery({ onOpenSheet }: { onOpenSheet: () => void }) {
  const [checked, setChecked] = useState(true);
  const toast = useToast();
  const pop = usePopover();
  const menu = useMenu();
  const items = (): MenuEntry[] => [
    { head: 'Row' },
    { label: 'Open', sc: '↩', run: () => toast.status('Open') },
    { label: 'Re-poll', run: () => toast.toast('Re-polled ledgerline') },
    { sep: true },
    { label: 'Show Groups', checked, run: () => setChecked((v) => !v) },
    { label: 'Disabled item', disabled: true, run: () => {} },
  ];
  return (
    <GallerySection title="overlays/">
      <Specimen label="Menu: right-click the box (fixed items), or the button (keyboard: arrows, Enter, Esc)">
        <div
          style={{ padding: '6px 14px', border: '1px dashed var(--border-3)', borderRadius: 6 }}
          onContextMenu={(e) => {
            e.preventDefault();
            menu.openAt(e.clientX, e.clientY, { items: items() });
          }}
        >
          right-click me
        </div>
        <Button onClick={(e) => menu.openFrom(e.currentTarget, { items: items(), highlightFirst: true })}>Open menu</Button>
        {menu.menu}
      </Specimen>
      <Specimen label="Popover: hover for the tooltip, click for a sticky one">
        <span
          style={{ padding: '2px 8px', border: '1px dashed var(--border-3)', borderRadius: 6 }}
          onMouseEnter={(e) =>
            pop.show(e.currentTarget, <><h4>ledgerline · Hands-off</h4><Legend rows={[[<TierMark key="m" tier="hands_off" />, 'dep-bump.patch']]} /></>, { delay: true })
          }
          onMouseLeave={pop.hide}
        >
          hover me
        </span>
        <Button onClick={(e) => pop.toggle(e.currentTarget, <><h4>Sticky</h4>Closes on Escape or an outside click.</>, 'below')}>Sticky</Button>
        {pop.popover}
      </Specimen>
      <Specimen label="Sheet (drops from the top of the pane)">
        <Button onClick={onOpenSheet}>Open sheet</Button>
      </Specimen>
      <Specimen label="Toast and status-bar message">
        <Button onClick={() => toast.toast('Saved. Nothing ran.')}>Toast</Button>
        <Button onClick={() => toast.status('Copied acme-lab/core/ledgerline')}>Status message</Button>
      </Specimen>
    </GallerySection>
  );
}

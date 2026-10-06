'use client';

import { useState } from 'react';
import { Button } from '@/components/controls/Button';
import { Checkbox } from '@/components/controls/Checkbox';
import { Kbd } from '@/components/controls/Kbd';
import { ObjectLink } from '@/components/controls/ObjectLink';
import { SegmentedControl, type SegmentOption } from '@/components/controls/toolbar/SegmentedControl';
import { Stepper, type StepperStep } from '@/components/controls/toolbar/Stepper';
import { TierMark } from '@/components/status/TierMark';
import { GallerySection } from './GallerySection';
import { Specimen } from './Specimen';

const TIERS: SegmentOption<string>[] = [
  { value: 'all', label: 'All', count: 31, title: 'All tiers' },
  { value: 'h', label: <TierMark tier="hands_off" />, count: 8, ariaLabel: 'Hands-off, 8' },
  { value: 'a', label: <TierMark tier="assisted" />, count: 0, ariaLabel: 'Assisted, 0' },
  { value: 'q', label: <TierMark tier="quarantined" />, count: 2, ariaLabel: 'Quarantined, 2' },
];

const step = (k: number, name: string, over: Partial<StepperStep<number>>): StepperStep<number> => ({
  k, name, title: name, enabled: true, current: false, past: false, count: null, loud: false, ...over,
});

/** Pane-level controls. The toolbar ones (segmented, lozenge, popup, search) live in the gallery's own toolbar. */
export function ControlsGallery() {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const [tier, setTier] = useState('all');
  const [at, setAt] = useState(2);
  const steps = [
    step(1, 'Pick', { past: at > 1, current: at === 1, count: 2 }),
    step(2, 'Preview', { past: at > 2, current: at === 2, count: 1 }),
    step(3, 'Send', { past: at > 3, current: at === 3, count: 2, loud: true }),
    step(4, 'After merge', { current: at === 4, enabled: false }),
  ];
  return (
    <GallerySection title="controls/">
      <Specimen label="Button default / primary / accent / ghost / danger">
        <Button>Not now</Button>
        <Button variant="primary">Open policy MR</Button>
        <Button variant="accent">Set up…</Button>
        <Button variant="ghost">Later</Button>
        <Button variant="danger">Revoke</Button>
      </Specimen>
      <Specimen label="Button mini (row button) / disabled">
        <Button size="mini">Read draft</Button>
        <Button size="mini" variant="accent">
          Stage
        </Button>
        <Button disabled>Disabled</Button>
      </Specimen>
      <Specimen label="Button with href: a link that looks like a button (default / mini)">
        <Button href="/needs-you" variant="primary">
          Re-admit…
        </Button>
        <Button href="/needs-you" variant="primary" size="mini">
          Re-admit…
        </Button>
        <Button href="/ladder" variant="ghost">
          Open the ladder
        </Button>
      </Specimen>
      <Specimen label="SegmentedControl with node labels and counts (a count of 0 stays)">
        <SegmentedControl label="Filter by tier" options={TIERS} value={tier} onChange={setTier} />
      </Specimen>
      <Specimen label="Stepper: click a step. Past ticked, current raised, Send's count loud, After merge disabled">
        <Stepper steps={steps} onGo={setAt} label="Next move" />
      </Specimen>
      <Specimen label="ObjectLink (read-only; click toasts what would open)">
        <ObjectLink target="pipeline #9812" />
        <ObjectLink target="!41" label="MR !41" />
      </Specimen>
      <Specimen label="Checkbox on / off / disabled">
        <Checkbox checked={a} onChange={setA} label="First item" />
        <Checkbox checked={b} onChange={setB} label="Second item" />
        <Checkbox checked={false} onChange={() => {}} label="Disabled item" disabled />
      </Specimen>
      <Specimen label="Kbd">
        <Kbd>⌘I</Kbd>
        <Kbd>Ctrl</Kbd>
        <Kbd>/</Kbd>
        <Kbd>Esc</Kbd>
      </Specimen>
    </GallerySection>
  );
}

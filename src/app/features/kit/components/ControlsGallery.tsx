'use client';

import { useState } from 'react';
import { Button } from '@/components/controls/Button';
import { Checkbox } from '@/components/controls/Checkbox';
import { Kbd } from '@/components/controls/Kbd';
import { GallerySection } from './GallerySection';
import { Specimen } from './Specimen';

/** Pane-level controls. The toolbar ones (segmented, lozenge, popup, search) live in the gallery's own toolbar. */
export function ControlsGallery() {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
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

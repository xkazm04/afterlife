'use client';

import { useState } from 'react';
import { Kbd } from '@/components/controls/Kbd';
import { BottomDrawer } from '@/components/shell/BottomDrawer';
import { CommandDock } from '@/components/shell/dock/CommandDock';
import { DockKey } from '@/components/shell/dock/DockKey';
import { DockText } from '@/components/shell/dock/DockText';
import { Card } from '@/components/surface/Card';
import { GallerySection } from './GallerySection';
import { Specimen } from './Specimen';
import styles from './ShellGallery.module.css';

/** shell/ parts that frame a pane (BottomDrawer, CommandDock) and surface/Card. The sidebar parts are in the sidebar. */
export function ShellGallery() {
  const [open, setOpen] = useState(true);
  return (
    <GallerySection title="shell/ and surface/">
      <Specimen label="BottomDrawer: count lit above zero, hint, hide; scrolling body">
        <div className={styles.frame}>
          <div className={styles.pane}>the pane above the drawer</div>
          {open ? (
            <BottomDrawer title="Outbox" count={2} hint="nothing runs until you press Run" closeLabel="Hide outbox" onClose={() => setOpen(false)}>
              <Card className={styles.row}>staged write one</Card>
              <Card className={styles.row}>staged write two</Card>
              <Card className={styles.row}>staged write three</Card>
            </BottomDrawer>
          ) : (
            <button type="button" className={styles.again} onClick={() => setOpen(true)}>
              show the drawer again
            </button>
          )}
        </div>
      </Specimen>
      <Specimen label="BottomDrawer compact and empty (count 0, not lit)">
        <div className={styles.frame}>
          <div className={styles.pane}>the pane</div>
          <BottomDrawer title="Outbox" count={0} closeLabel="Hide outbox" onClose={() => {}} compact>
            <span>Empty · a decision stages its write here.</span>
          </BottomDrawer>
        </div>
      </Specimen>
      <Specimen label="CommandDock: the line and the keys (optional keys drop below 820 px)">
        <div className={styles.dockFrame}>
          <CommandDock
            line={
              <>
                <DockText tone="prompt">r ▸</DockText> <b>dep-bump.patch</b> → Supervised · git commit -am &quot;demote&quot; <DockText tone="note">(as you)</DockText>
              </>
            }
          >
            <DockKey>
              <Kbd>j</Kbd>
              <Kbd>k</Kbd> move
            </DockKey>
            <DockKey optional>
              <Kbd>p</Kbd> promote
            </DockKey>
          </CommandDock>
        </div>
      </Specimen>
      <Specimen label="Card">
        <Card className={styles.card}>a quiet raised tile</Card>
        <Card className={styles.card}>another</Card>
      </Specimen>
    </GallerySection>
  );
}

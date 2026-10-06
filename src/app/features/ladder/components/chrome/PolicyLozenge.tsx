'use client';

import type { Ref } from 'react';
import { Lozenge } from '@/components/controls/lozenge/Lozenge';
import { LozengeButton } from '@/components/controls/lozenge/LozengeButton';
import { LozengeDivider } from '@/components/controls/lozenge/LozengeDivider';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { THRESHOLD_NOTE, POLICY } from '../../data/policy';
import type { Head } from '../../model/types';
import styles from './chrome.module.css';

/** The policy lozenge: version, the tier-state.yml head and "policy numbers". Any cell opens the policy popover. */
export function PolicyLozenge({ head, onOpen, anchorRef }: { head: Head; onOpen: () => void; anchorRef: Ref<HTMLDivElement> }) {
  return (
    <div ref={anchorRef} className={styles.anchor}>
      <Lozenge label="Policy">
        <LozengeButton count={<code className={styles.sha}>{POLICY.version}</code>} word="policy" title="Policy" onClick={onOpen} />
        <LozengeDivider />
        <LozengeButton
          lead={
            <svg className={styles.branch} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
              <circle cx="6" cy="6" r="2.2" />
              <path d="M0 6h3.8M8.2 6H12" />
            </svg>
          }
          count={<code className={styles.sha}>{head.sha}</code>}
          word={head.by}
          title="tier-state.yml head"
          onClick={onOpen}
        />
        <LozengeDivider />
        <LozengeButton lead={<HonestyChip kind="unknown">policy numbers</HonestyChip>} title={THRESHOLD_NOTE} onClick={onOpen} />
      </Lozenge>
    </div>
  );
}

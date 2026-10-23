'use client';

import type { Ref } from 'react';
import { Lozenge } from '@/components/controls/lozenge/Lozenge';
import { LozengeButton } from '@/components/controls/lozenge/LozengeButton';
import { LozengeDivider } from '@/components/controls/lozenge/LozengeDivider';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { POLICY_HISTORY, THRESHOLD_NOTE } from '../../data/policy';
import type { Head } from '../../model/types';
import { DemoChip } from './DemoChip';
import { Icon } from '@/components/icons/Icon';
import styles from './chrome.module.css';

/**
 * The policy lozenge: its revision, the tier-state.yml head and "policy numbers". Any cell opens the policy popover. The
 * revision and an opening head are the demo's history: in live mode (`history`) they are marked demo.
 */
export function PolicyLozenge({ head, history, onOpen, anchorRef }: { head: Head; history: boolean; onOpen: () => void; anchorRef: Ref<HTMLDivElement> }) {
  return (
    <div ref={anchorRef} className={styles.anchor}>
      <Lozenge label="Policy">
        <LozengeButton
          count={
            <>
              <code className={styles.sha}>{POLICY_HISTORY.version}</code> <DemoChip on={history} what="The policy revision" />
            </>
          }
          word="policy"
          title="Policy"
          onClick={onOpen}
        />
        <LozengeDivider />
        <LozengeButton
          lead={
<Icon name="branch" />
          }
          count={
            <>
              <code className={styles.sha}>{head.sha}</code> <DemoChip on={!!head.demo} what="The tier-state.yml head" />
            </>
          }
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

'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import type { PolicyRules } from '@/server/data/types';
import { POLICY_HISTORY, policyLines } from '../../data/policy';
import type { Head } from '../../model/types';
import { DemoChip } from '../chrome/DemoChip';
import styles from './help.module.css';

const HeadContext = createContext<Head | null>(null);

/**
 * The popover is built once, at press time, and stored: whatever it captured is stale after the next write. Its
 * tier-state.yml head is read from here instead, so it follows the screen's head (the lozenge's) while it is open.
 */
export function PolicyHeadProvider({ head, children }: { head: Head; children: ReactNode }) {
  return <HeadContext.Provider value={head}>{children}</HeadContext.Provider>;
}

/**
 * The policy behind the toolbar lozenge. The rules are trust-policy.yml's, as the server read them; the thresholds are
 * policy numbers, not measurements. The revision, when it merged and an opening head are the demo's history: marked demo
 * in live mode (`history`, `head.demo`).
 */
export function PolicyContent({ rules, history }: { rules: PolicyRules | null; history: boolean }) {
  const head = useContext(HeadContext);
  if (!head) throw new Error('PolicyContent renders inside a PolicyHeadProvider');
  const lines = rules ? policyLines(rules) : null;
  const unread = 'trust-policy.yml has not been read';
  return (
    <>
      <h4>
        Policy {POLICY_HISTORY.version} · profile {rules?.profile ?? 'unknown'} <DemoChip on={history} what="The policy revision" />
      </h4>
      <dl className={styles.pk}>
        <dt>Merged</dt>
        <dd>
          {POLICY_HISTORY.mergedAgo} <DemoChip on={history} what="When the policy merged" />
        </dd>
        <dt>tier-state.yml</dt>
        <dd>
          <code className={styles.code}>{head.sha}</code> · {head.by} <DemoChip on={!!head.demo} what="The tier-state.yml head" />
        </dd>
        <dt>Thresholds</dt>
        <dd>
          <HonestyChip kind="unknown">policy numbers, not measurements</HonestyChip>
        </dd>
        <dt>One step down</dt>
        <dd>{lines?.oneStepDown ?? unread}</dd>
        <dt>→ Quarantined</dt>
        <dd>{lines?.toQuarantined ?? unread}</dd>
        <dt>Envelope</dt>
        <dd>{lines?.envelope ?? unread}</dd>
      </dl>
    </>
  );
}

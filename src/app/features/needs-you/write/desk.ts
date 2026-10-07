// The desk's writes that the server plans and runs: a policy MR (n1, n4: write/promote.ts) and a gap MR (g1..g4: Maturity's
// gap door, write/gap.ts). One ask and one send for both, so a screen cannot send a gap any other way. The desk is the
// demo's (the live list never draws it), so a gap's data mode is always 'demo'.
import { askGapMr, gapSend, sendGapMr } from '@/app/features/maturity/write/gap';
import type { ActionResponse, PromoteClass, StageGapMr } from '@/server/actions/types';
import type { WriteView } from '@/server/actions/words';
import type { NeedsYouDemo } from '../data/types';
import { isPolicyKey } from '../model/outbox/policy';
import { isGapId } from '../model/rows/rowState';
import { askPolicyMr, policyIntent, sendPolicyMr } from './promote';

export type DeskIntent = PromoteClass | StageGapMr;

/** Why a desk gap is not sent (or null when it is): the probe, a gap with no proposal files. */
export function gapBlock(id: string, demo: NeedsYouDemo): string | null {
  const g = demo.gaps.find((x) => x.id === id);
  if (!g) return 'This gap is not in the list.';
  const send = gapSend(demo.project, g, 'demo');
  return send.ok ? null : send.reason;
}

/** The write a decision sends, or null when it sends none through the server. */
export function deskIntent(key: string, demo: NeedsYouDemo): DeskIntent | null {
  if (isPolicyKey(key)) return policyIntent(key, demo);
  const g = isGapId(key) ? demo.gaps.find((x) => x.id === key) : undefined;
  const send = g ? gapSend(demo.project, g, 'demo') : null;
  return send?.ok ? send.intent : null;
}

/** Ask for the exact write. Never sends anything. */
export const askDesk = (intent: DeskIntent): Promise<WriteView> => (intent.kind === 'stage-gap-mr' ? askGapMr(intent) : askPolicyMr(intent));

/** Confirm the write on screen by its preview id. Null when there is none on screen (nothing is sent). */
export const sendDesk = (intent: DeskIntent, view: WriteView | undefined): Promise<ActionResponse | null> =>
  intent.kind === 'stage-gap-mr' ? sendGapMr(intent, view) : sendPolicyMr(intent, view);

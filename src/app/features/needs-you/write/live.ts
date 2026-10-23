// The live desk's writes: a policy MR (a promotion or a re-admit, write/promote.ts) or a gap template MR
// (write/gapTemplate.ts). One ask and one send for both, so the live desk cannot send a write any other way.
import type { ActionResponse } from '@/server/actions/types';
import type { WriteView } from '@/server/actions/words';
import type { DeskIntent } from '../model/desk';
import { writeName } from '../model/live';
import { askGapTemplate, gapTemplateName, sendGapTemplate } from './gapTemplate';
import { askPolicyMr, sendPolicyMr } from './promote';

/** Ask for the exact write. Never sends anything. */
export const askLive = (intent: DeskIntent): Promise<WriteView> =>
  intent.kind === 'apply-gap-template' ? askGapTemplate(intent) : askPolicyMr(intent);

/** Confirm the write on screen by its preview id. Null when there is none on screen (nothing is sent). */
export const sendLive = (intent: DeskIntent, view: WriteView | undefined): Promise<ActionResponse | null> =>
  intent.kind === 'apply-gap-template' ? sendGapTemplate(intent, view) : sendPolicyMr(intent, view);

/** The write, as an answer names it. */
export const liveWriteName = (intent: DeskIntent): string => (intent.kind === 'apply-gap-template' ? gapTemplateName(intent) : writeName(intent));

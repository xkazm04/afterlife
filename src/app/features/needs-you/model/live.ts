// Live Needs you: what each item the poll found can do from this list. A promotion or a re-admit is one policy MR through
// the server actions (write/promote.ts), the door the desk uses: the exact write is the server's preview, and Run confirms
// that preview by its id. A live gap that carries its fixed template is one draft MR the same way (apply-gap-template).
// Every other kind is read-only here and says where to act today. Pure.
import type { NeedsKind, NeedsYouItem } from '@/lib/demo';
import { TIER_META } from '@/lib/tiers';
import { STAGES } from '@/schemas/stages';
import { TIER_ORDER } from '@/schemas/tier';
import type { ApplyGapTemplate, GapTemplateId, PromoteClass } from '@/server/actions/types';
import type { Outcome } from '@/server/actions/words';
import { POLICY_FILE } from './outbox/policy';

/** The action class an inbox title names after its last " · " ("Promote T7 qa · qa.file-bug"). */
export const classOfTitle = (title: string): string | null => title.split(' · ').at(-1)?.trim() || null;

/** The write a live item sends, or null when it sends none from here. A re-admit is a promote-class to Assisted, never higher. */
export function liveIntent(item: Pick<NeedsYouItem, 'id' | 'kind' | 'title' | 'to'>, project: string): PromoteClass | null {
  const cls = item.kind === 'promote' || item.kind === 'readmit' ? classOfTitle(item.title) : null;
  if (!cls) return null;
  if (item.kind === 'readmit') return { kind: 'promote-class', project, class: cls, to: 'assisted', proposal: item.id };
  const to = TIER_ORDER.find((t) => t === item.to);
  return to ? { kind: 'promote-class', project, class: cls, to, proposal: item.id } : null;
}

// A Record so a template the server adds and this list does not know fails the type check, not the click.
const TEMPLATES: Readonly<Record<GapTemplateId, true>> = { 'secure-includes': true, 'package-build': true, 'plan-issue-templates': true };
const isTemplate = (t: string | null | undefined): t is GapTemplateId => !!t && Object.hasOwn(TEMPLATES, t);

/** The draft MR a live gap sends from its fixed template, or null when it carries none (or its stage or rung is unreadable). */
export function gapIntent(item: Pick<NeedsYouItem, 'id' | 'kind' | 'stage' | 'rungFrom' | 'rungTo' | 'template'>, project: string): ApplyGapTemplate | null {
  const stage = STAGES.find((s) => s === item.stage);
  if (item.kind !== 'gaps' || !stage || typeof item.rungTo !== 'number' || !isTemplate(item.template)) return null;
  return { kind: 'apply-gap-template', project, proposal: item.id, stage, from: item.rungFrom ?? null, to: item.rungTo, template: item.template };
}

/** Why a live gap with no template is read-only: the scan's next change, which is not mechanical; else where to act. */
export const gapReadOnly = (item: Pick<NeedsYouItem, 'change'>): string => (item.change ? `Read-only here: ${item.change}` : elsewhere('gaps'));

const RUN: Readonly<Partial<Record<NeedsKind, string>>> = { readmit: 'Run · open the re-admit MR', gaps: 'Run · open the gap MR' };

/** The button: "Run · open the promotion MR" / "… the re-admit MR" / "… the gap MR". */
export const runLabel = (kind: NeedsKind): string => RUN[kind] ?? 'Run · open the promotion MR';

/** A live write's diff file line: the policy file, or the gap MR's project and branch (the template's name until one is planned). */
export const diffFile = (intent: PromoteClass | ApplyGapTemplate, branch: string | undefined): string =>
  intent.kind === 'promote-class' ? POLICY_FILE : `${intent.project} · ${branch ?? intent.template}`;

/** The write, as an answer names it: "code-fix.patch → Supervised". */
export const writeName = (intent: PromoteClass): string => `${intent.class} → ${TIER_META[intent.to].name}`;

const ELSEWHERE: Readonly<Partial<Record<NeedsKind, string>>> = {
  signoff: 'Read-only here: sign off on the CRA clock work item in GitLab. This list does not send the sign-off yet.',
  gaps: 'Read-only here: open a gap merge request from Maturity, which previews it first. A gap sends from this list only when it carries its files from the live source, and none does yet.',
  setup: 'Read-only here: finish this step in Setup or in GitLab.',
};

/** Where to act on an item this list sends nothing for. */
export const elsewhere = (kind: NeedsKind): string => ELSEWHERE[kind] ?? 'Read-only here: act on it in GitLab.';

/** What the list holds of a sent write's answer: only what the response said. */
export interface LiveAnswer {
  status: Outcome['status'];
  text: string;
}

/** The answer when the confirm got no response at all. */
export const noAnswer = (text: string): LiveAnswer => ({ status: 'failed', text });

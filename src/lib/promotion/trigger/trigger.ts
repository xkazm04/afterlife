// Which demotion trigger fired, in words. The tripwire's record states one `reason` (a DemotionTrigger of
// trust-policy.yml); the index keeps it as the move's note, and the Last move text carries it after "tripwire". Only the
// six defined triggers are worded; anything else, or nothing, reads "trigger not recorded" and never a guess.

/** trust-policy.yml's demotion triggers, in words. */
export const TRIGGER_WORDS: Readonly<Record<string, string>> = {
  revert: 'revert',
  reopened_finding: 'reopened finding',
  post_merge_proof_fail: 'post-merge proof failure',
  default_branch_red_1h: 'red main ≤ 1 h',
  guardrail_high: 'guardrail high-severity block',
  budget_breach_x2: 'budget breach twice',
};

export const TRIGGER_NOT_RECORDED = 'trigger not recorded';

export const isTrigger = (id: string | null | undefined): id is string => !!id && Object.hasOwn(TRIGGER_WORDS, id);

/** The words of a fired trigger; an unrecognised or missing one says so. */
export const triggerWords = (id: string | null | undefined): string => (isTrigger(id) ? (TRIGGER_WORDS[id] as string) : TRIGGER_NOT_RECORDED);

const TRIP = /^(.*\btripwire)(?: · (.+))?$/;

/** The stored Last move text ("4 min ago · tripwire · guardrail_high", or the older "... · tripwire") as shown. */
export function displayLastMove(text: string): string {
  const m = TRIP.exec(text);
  return m ? `${m[1]} · ${triggerWords(m[2])}` : text;
}

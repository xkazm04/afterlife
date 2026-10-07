// The policy MRs this desk opens, through the server actions. A promotion (n1) and a re-admission (n4, quarantined ->
// assisted) are both a promote-class intent: the server plans the branch commit and the MR from belay-policy as it is,
// and refuses what trust-policy.yml does not allow. previewAction when the decision is in view (nothing runs);
// confirmAction with that preview's id on Run. Belay never merges: a person does, in GitLab.
import { confirmAction, previewAction } from '@/server/actions/actions';
import type { ActionResponse, PromoteClass } from '@/server/actions/types';
import { unreachable, viewOf, type WriteView } from '@/server/actions/words';
import type { NeedsYouDemo } from '../data/types';
import type { PolicyKey } from '../model/types';

/** n1 raises its class to the tier it asks for; n4 re-admits its class at Assisted, never at its old tier. */
export function policyIntent(key: PolicyKey, demo: Pick<NeedsYouDemo, 'project' | 'promote' | 'readmit'>): PromoteClass {
  return key === 'n1'
    ? { kind: 'promote-class', project: demo.project, class: demo.promote.cls, to: demo.promote.to, proposal: 'n1' }
    : { kind: 'promote-class', project: demo.project, class: demo.readmit.cls, to: 'assisted', proposal: 'n4' };
}

/** The decision is in view: ask for its exact write. Never sends anything. */
export function askPolicyMr(intent: PromoteClass): Promise<WriteView> {
  return previewAction(intent).then(viewOf, unreachable);
}

/** Run: confirm the write on screen by its preview id. Null when there is none on screen (nothing is sent). */
export async function sendPolicyMr(intent: PromoteClass, view: WriteView | undefined): Promise<ActionResponse | null> {
  if (view?.kind !== 'preview') return null;
  return confirmAction(intent, view.preview.previewId);
}

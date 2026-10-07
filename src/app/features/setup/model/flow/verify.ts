import type { ArmCheck } from '@/server/actions/arm/read';

/** What a verify settles: `ok` only when the read saw what the MR was for (the block there for an arm, gone for a disarm). */
export interface Verdict {
  ok: boolean;
  simulated: boolean;
  text: string;
}

/** The server's answer as a verdict. A refusal or a read that saw otherwise never arms or disarms a track. */
export function verdictOf(check: ArmCheck, revert: boolean): Verdict {
  switch (check.status) {
    case 'simulated':
      return { ok: true, simulated: true, text: check.text };
    case 'refused':
      return { ok: false, simulated: false, text: `could not verify: ${check.reason}` };
    case 'read':
      return { ok: check.armed !== revert, simulated: false, text: check.text };
  }
}

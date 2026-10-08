// Live mode's probes: no timer, no scripted outcome. A step's verify and Re-probe ask the server to read again, and the
// screen shows what that read saw (a refusal included: the step then says unknown, with the reason).
import type { Dispatch } from 'react';
import { NOT_PROBED, stampOf } from '@/server/data/setup/types';
import { canSayDone, type SetupAction } from '../model/flow/reducer';
import { stepDetail } from '../model/flow/state';
import { saidText } from '../model/flow/wording';
import type { SetupState } from '../model/types';
import { reread } from '../read/reread';

export interface LiveProbes {
  probe: (n: number) => Promise<void>;
  reprobe: () => Promise<void>;
  sayDone: (n: number) => void;
  unsay: (n: number) => void;
}

/** What a step's verify tells when the read saw it neither done nor not done. */
function unreadText(s: SetupState, n: number, reason: string | null): string {
  if (reason && reason !== NOT_PROBED) return `step ${n} · unknown · ${reason}`;
  const why = stepDetail(s, n)?.unread;
  return why ? `step ${n} · no read can see it: ${why}` : `step ${n} · Belay has no probe for this step yet: it stays unknown`;
}

/** `now()` is the state as it is when a probe is asked for (the hook's ref, read only in its handlers). */
export function liveProbes(now: () => SetupState, dispatch: Dispatch<SetupAction>, tell: (m: string) => void): LiveProbes {
  return {
    probe: async (n) => {
      const cur = now().steps[n];
      if (!cur || cur.st === 'probing') return;
      dispatch({ t: 'probe-start', n });
      const r = await reread('steps');
      if (r.status !== 'steps') {
        const reason = r.status === 'refused' ? r.reason : 'the server answered something else';
        dispatch({ t: 'steps-read', steps: { ...stampOf(new Date()), steps: { [n]: { state: 'unknown', reason } } } });
        tell(`step ${n} · could not read: ${reason}`);
        return;
      }
      dispatch({ t: 'steps-read', steps: r.steps });
      const read = r.steps.steps[n];
      tell(!read || read.state === 'unknown' ? unreadText(now(), n, read?.reason ?? null) : `step ${n} · ${read.text}`);
    },
    sayDone: (n) => {
      if (!canSayDone(now(), n)) return;
      const at = stampOf(new Date()).label;
      dispatch({ t: 'say-done', n, at });
      tell(`step ${n} · ${saidText(at)}`);
    },
    unsay: (n) => {
      if (!now().steps[n]?.said) return;
      dispatch({ t: 'unsay', n });
      tell(`step ${n} · taken back: it counts as yours again`);
    },
    reprobe: async () => {
      if (now().doctorBusy) return;
      dispatch({ t: 'doctor-start' });
      const r = await reread('doctor');
      const why = r.status === 'refused' ? r.reason : 'no answer';
      dispatch({ t: 'doctor-read', doctor: r.status === 'doctor' ? r.doctor : null, reason: why, at: stampOf(new Date()) });
      tell(r.status === 'doctor' ? (r.doctor.error ? `belay doctor · ${r.doctor.error}` : `belay doctor · ${now().group} probed at ${r.doctor.label}`) : `belay doctor · not probed: ${why}`);
    },
  };
}

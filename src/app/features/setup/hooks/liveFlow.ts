// Live mode's probes: no timer, no scripted outcome. A step's verify and Re-probe ask the server to read again, and the
// screen shows what that read saw (a refusal included: the step then says unknown, with the reason).
import type { Dispatch } from 'react';
import { stampOf } from '@/server/data/setup/types';
import type { SetupAction } from '../model/flow/reducer';
import type { SetupState } from '../model/types';
import { reread } from '../read/reread';

export interface LiveProbes {
  probe: (n: number) => Promise<void>;
  reprobe: () => Promise<void>;
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
      tell(!read || read.state === 'unknown' ? `step ${n} · Belay has no probe for this step yet: it stays unknown` : `step ${n} · ${read.text}`);
    },
    reprobe: async () => {
      if (now().doctorBusy) return;
      dispatch({ t: 'doctor-start' });
      const r = await reread('doctor');
      dispatch({ t: 'doctor-read', doctor: r.status === 'doctor' ? r.doctor : null });
      tell(r.status === 'doctor' ? (r.doctor.error ? `belay doctor · ${r.doctor.error}` : `belay doctor · ${now().group} probed at ${r.doctor.label}`) : `belay doctor · not probed: ${r.status === 'refused' ? r.reason : 'no answer'}`);
    },
  };
}
